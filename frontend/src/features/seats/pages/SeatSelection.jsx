import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { tripApi } from "../../trips/services/tripApi";
import { lockSeats } from "../../bookings/services/bookingApi";
import { showError, showLoading, showSuccess } from "../../../utils/toastHelper";
import { useTripSeatSync } from "../hooks/useTripSeatSync";
import {
  buildSeatsWithState,
  mergeBookingSeatsSnapshots,
  normalizeBookingSeatsList,
} from "../utils/seatState";

const SeatSelection = () => {
  // Route params: which trip we are selecting seats for.
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // API data + UI state
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const realtimeBookingSeatsRef = useRef(null);
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    fetchGenerationRef.current += 1;
    realtimeBookingSeatsRef.current = null;
    setTripData(null);
    setSelectedSeats([]);
    setLoading(true);
  }, [tripId]);

  useEffect(() => {
    // If user returned from SSLCommerz/payment flow, show a toast once based on `?payment=...`
    // and then remove the query param so reload/back doesn't show it again.
    const payment = searchParams.get("payment");
    if (!payment || !tripId) return undefined;

    const dedupeKey = `pay-return:${tripId}:${payment}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(dedupeKey)) {
      const next = new URLSearchParams(searchParams);
      next.delete("payment");
      setSearchParams(next, { replace: true });
      return undefined;
    }
    try {
      sessionStorage.setItem(dedupeKey, "1");
    } catch {
      // ignore
    }

    if (payment === "time_expired") {
      showError("Time expired for payment");
    } else if (payment === "failed") {
      showError("Payment failed");
    } else if (payment === "cancelled") {
      showError("Payment was cancelled");
    } else if (payment === "no_session") {
      showError("Payment session was not found");
    }

    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    setSearchParams(next, { replace: true });
    return undefined;
  }, [searchParams, setSearchParams, tripId]);

  const fetchTripDetails = useCallback(async ({ silent = false } = {}) => {
    const generation = silent ? null : fetchGenerationRef.current + 1;
    if (!silent) {
      fetchGenerationRef.current = generation;
      setLoading(true);
    }
    const requestTripId = tripId;
    try {
      const data = await tripApi.getTripDetails(requestTripId);
      if (requestTripId !== tripId) {
        return;
      }
      if (!silent && fetchGenerationRef.current !== generation) {
        return;
      }
      const bookingSeats = mergeBookingSeatsSnapshots(
        data.bookingSeats,
        realtimeBookingSeatsRef.current,
      );
      setTripData({ ...data, bookingSeats });
    } catch (err) {
      if (requestTripId !== tripId) {
        return;
      }
      if (!silent && fetchGenerationRef.current !== generation) {
        return;
      }
      console.error("Failed to fetch trip details:", err);
      if (!silent) {
        showError("Failed to load trip details");
      }
    } finally {
      if (!silent && fetchGenerationRef.current === generation) {
        setLoading(false);
      }
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripDetails();
  }, [fetchTripDetails]);

  useTripSeatSync(tripId, {
    enabled: Boolean(tripId),
    onSeatsUpdated: (bookingSeats) => {
      const rows = normalizeBookingSeatsList(bookingSeats);
      setTripData((prev) => {
        const merged = mergeBookingSeatsSnapshots(prev?.bookingSeats, rows);
        realtimeBookingSeatsRef.current = merged;
        return prev ? { ...prev, bookingSeats: merged } : prev;
      });
    },
    onFallbackPoll: () => fetchTripDetails({ silent: true }),
  });

  const allSeats = useMemo(
    () => buildSeatsWithState(tripData?.bus?.seats, tripData?.bookingSeats, null),
    [tripData],
  );

  // Per-seat price comes from the trip (string/number) so normalize as float.
  const PRICE_PER_SEAT = tripData ? parseFloat(tripData.price) : 0;

  const handleSeatClick = (seat) => {
    // Guard: do not allow selecting seats already reserved/locked.
    if (seat.seatState === "reserved") {
      showError("Seat already booked");
      return;
    }
    if (seat.seatState === "locked") {
      showError("Seat already booked");
      return;
    }
    setSelectedSeats((prev) => {
      if (prev.includes(seat.id)) {
        // Clicking a selected seat unselects it.
        showSuccess("Seat released");
        return prev.filter((s) => s !== seat.id);
      } else {
        // Cap seat selection to 4 (matches backend business rule).
        if (prev.length >= 4) {
          showError("You can select up to 4 seats");
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  const totalPrice = selectedSeats.length * PRICE_PER_SEAT;
  const busClass = tripData?.bus?.busClass ?? "ECONOMY";
  const busType = tripData?.bus?.busType ?? "NON_AC";
  const seatsByRow = useMemo(() => {
    // Group seats by row to render the grid row-by-row (economy / non-sleeper).
    const grouped = new Map();
    allSeats.forEach((seat) => {
      const row = Number(seat.rowNumber ?? 1);
      if (!grouped.has(row)) {
        grouped.set(row, []);
      }
      grouped.get(row).push(seat);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rowNumber, seats]) => ({
        rowNumber,
        seats: seats.sort((a, b) => Number(a.columnNumber) - Number(b.columnNumber)),
      }));
  }, [allSeats]);
  const businessRows = useMemo(() => {
    // Business bus layout: special grouping (front rows 1x2-ish + last row 2x2)
    // to match the UI aisle split used below.
    if (busClass !== "BUSINESS" || busType === "SLEEPER") {
      return [];
    }

    const sortedSeats = [...allSeats].sort((a, b) => {
      const byRow = Number(a.rowNumber ?? 0) - Number(b.rowNumber ?? 0);
      if (byRow !== 0) return byRow;
      return Number(a.columnNumber ?? 0) - Number(b.columnNumber ?? 0);
    });

    const rows = [];
    let cursor = 0;

    for (let row = 0; row < 8 && cursor < sortedSeats.length; row += 1) {
      rows.push({
        rowNumber: row + 1,
        seats: sortedSeats.slice(cursor, cursor + 3),
      });
      cursor += 3;
    }

    if (cursor < sortedSeats.length) {
      rows.push({
        rowNumber: 9,
        seats: sortedSeats.slice(cursor, cursor + 4),
      });
    }

    return rows;
  }, [allSeats, busClass, busType]);
  const sleeperDeckRows = useMemo(() => {
    // Sleeper layout: split into Upper/Lower deck based on seat label prefix (U*/L*),
    // and chunk into fixed-size rows for rendering.
    if (busType !== "SLEEPER") {
      return { upperRows: [], lowerRows: [] };
    }

    const upperSeats = allSeats.filter((seat) =>
      String(seat.seatNumber || "").startsWith("U")
    );
    const lowerSeats = allSeats.filter((seat) =>
      String(seat.seatNumber || "").startsWith("L")
    );

    const toRows = (seats) => {
      const rows = [];
      const seatsPerRow = 3;
      for (let i = 0; i < seats.length; i += seatsPerRow) {
        rows.push(seats.slice(i, i + seatsPerRow));
      }
      return rows;
    };

    return {
      upperRows: toRows(
        upperSeats.sort((a, b) => String(a.seatNumber).localeCompare(String(b.seatNumber)))
      ),
      lowerRows: toRows(
        lowerSeats.sort((a, b) => String(a.seatNumber).localeCompare(String(b.seatNumber)))
      ),
    };
  }, [allSeats, busType]);

  const handleContinue = async () => {
    // Locks selected seats in backend (creates/updates a PENDING bookingSeat lock)
    // and navigates to the booking page with selection + lock expiry time.
    if (selectedSeats.length === 0) return;
    
    const loadingToastId = showLoading("Locking seats...");
    try {
      setLocking(true);
      const lockResponse = await lockSeats({
        tripId,
        seatIds: selectedSeats,
      });
      showSuccess("Seat locked for 2 minutes", { id: loadingToastId });
      
      const { lockExpiresAt } = lockResponse;
      
      // Convert seat IDs to seat numbers for nicer display on the booking screen.
      const selectedSeatDetails = allSeats.filter(s => selectedSeats.includes(s.id));
      
      navigate("/booking", {
        state: {
          tripId,
          routeId: tripData.route?.id,
          selectedSeats: selectedSeats, // These are UUIDs/CUIDs
          selectedSeatNumbers: selectedSeatDetails.map(s => s.seatNumber),
          seatPrice: PRICE_PER_SEAT,
          busType: tripData.bus.busType,
          lockExpiresAt, // Pass the expiry time
        },
      });
    } catch (err) {
      console.error("Failed to lock seats:", err);
      const raw = err?.data?.message ?? err?.message;
      const msg = Array.isArray(raw)
        ? raw.join(" ")
        : String(raw ?? "Could not lock seats");
      const friendly =
        err.status === 409 || /unavailable|already booked|already reserved/i.test(msg)
          ? "Seat already booked"
          : msg;
      showError(friendly, { id: loadingToastId });
    } finally {
      setLocking(false);
    }
  };

  if (loading && !tripData) {
    // Initial load / lock request in progress.
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg text-green-600"></div>
          <p className="text-gray-500 font-medium">Loading available seats...</p>
        </div>
      </div>
    );
  }

  if (!tripData) {
    // Trip not found or failed load (after loading ended).
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">Trip not found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-green-600 font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 md:flex md:items-center md:justify-center p-0 md:p-4">
      {/* Container: Centered max-w-xl */}
      <div className="w-full max-w-xl mx-auto bg-white flex flex-col h-screen md:h-auto md:min-h-[600px] relative shadow-md md:rounded-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center border-b">
          <div>
            <h1 className="text-lg font-bold">Select Seats</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {tripData.route.origin} &rarr; {tripData.route.destination}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 text-2xl px-2 hover:text-gray-600 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Seat Layout Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-6">
          {/* Seat Legend: Available, Locked, Reserved, Selected */}
          <div className="flex gap-5 text-[10px] font-bold uppercase text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-200"></div>{" "}
              Avail
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-orange-100 border border-orange-200"></div>{" "}
              Locked
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-red-100 border border-red-200"></div>{" "}
              Reserved
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-green-600"></div> Selected
            </div>
          </div>

          {/* Seat Grid: 5 columns with class-based split */}
          <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 w-full max-w-[300px]">
            {/* Steering area indicator */}
            <div className="flex justify-end mb-6 pr-2">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-200"></div>
              </div>
            </div>

            {busType === "SLEEPER" ? (
              <div className="space-y-4">
                <SleeperDeck
                  title="Upper Deck"
                  rows={sleeperDeckRows.upperRows}
                  selectedSeats={selectedSeats}
                  onSeatClick={handleSeatClick}
                />
                <SleeperDeck
                  title="Lower Deck"
                  rows={sleeperDeckRows.lowerRows}
                  selectedSeats={selectedSeats}
                  onSeatClick={handleSeatClick}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-y-4">
                {(busClass === "BUSINESS" ? businessRows : seatsByRow).map(({ rowNumber, seats: rowSeats }, rowIndex) => {
                  const isLastBusinessRow =
                    busClass === "BUSINESS" &&
                    rowIndex === (busClass === "BUSINESS" ? businessRows.length : seatsByRow.length) - 1;
                  const leftSeatCount = isLastBusinessRow ? 2 : busClass === "BUSINESS" ? 1 : 2;

                  if (busClass === "BUSINESS") {
                    return (
                      <div key={rowNumber} className="flex justify-center gap-x-6 gap-y-4">
                        <div className="inline-flex items-center justify-center gap-2">
                          {rowSeats.slice(0, leftSeatCount).map((seat) => (
                            <SeatButton
                              key={seat.id}
                              seat={seat}
                              isSelected={selectedSeats.includes(seat.id)}
                              onClick={() => handleSeatClick(seat)}
                            />
                          ))}
                          {!isLastBusinessRow ? <div className="w-8" /> : null}
                          {rowSeats.slice(leftSeatCount).map((seat) => (
                            <SeatButton
                              key={seat.id}
                              seat={seat}
                              isSelected={selectedSeats.includes(seat.id)}
                              onClick={() => handleSeatClick(seat)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={rowNumber} className="flex justify-center gap-x-6 gap-y-4">
                      <div className="inline-flex items-center gap-2">
                        {rowSeats.slice(0, leftSeatCount).map((seat) => (
                          <SeatButton
                            key={seat.id}
                            seat={seat}
                            isSelected={selectedSeats.includes(seat.id)}
                            onClick={() => handleSeatClick(seat)}
                          />
                        ))}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        {rowSeats.slice(leftSeatCount).map((seat) => (
                          <SeatButton
                            key={seat.id}
                            seat={seat}
                            isSelected={selectedSeats.includes(seat.id)}
                            onClick={() => handleSeatClick(seat)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Sticky Bottom */}
        <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] sticky bottom-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                Seats Selected
              </span>
              <span className="text-lg font-bold text-gray-900">
                {selectedSeats.length || 0} Seat(s)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                Total Price
              </span>
              <span className="text-lg font-bold text-green-600">
                ৳{totalPrice}
              </span>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={selectedSeats.length === 0 || locking}
            className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-sm tracking-widest disabled:bg-gray-100 disabled:text-gray-300 transition-all active:scale-[0.98] shadow-lg shadow-green-100 uppercase"
          >
            {locking ? "LOCKING..." : "CONTINUE"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Seat button that reflects seat state (reserved/locked/available) + selection.
const SeatButton = ({ seat, isSelected, onClick }) => {
  const { seatNumber, seatState } = seat;
  const base =
    "w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all border-b-2";

  if (seatState === "reserved") {
    return (
      <button
        disabled
        title="Already reserved"
        className={`${base} bg-red-100 border-red-200 text-red-500/50 cursor-not-allowed`}
      >
        {seatNumber}
      </button>
    );
  }

  if (seatState === "locked") {
    return (
      <button
        disabled
        title="Temporarily locked by another user"
        className={`${base} bg-orange-100 border-orange-200 text-orange-500/60 cursor-not-allowed`}
      >
        {seatNumber}
      </button>
    );
  }

  if (seatState === "heldByMe") {
    return (
      <button
        disabled
        title="Held by you"
        className={`${base} bg-green-600 border-green-800 text-white shadow-md cursor-default`}
      >
        {seatNumber}
      </button>
    );
  }

  if (isSelected) {
    return (
      <button
        onClick={onClick}
        className={`${base} bg-green-600 border-green-800 text-white shadow-md active:translate-y-0.5 active:border-b-0`}
      >
        {seatNumber}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${base} bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200 active:translate-y-0.5 active:border-b-0`}
    >
      {seatNumber}
    </button>
  );
};

// Sleeper deck renderer (upper/lower) using the same SeatButton component.
const SleeperDeck = ({ title, rows, selectedSeats, onSeatClick }) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5">
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {title}
      </p>
      <div className="space-y-2">
        {rows.map((rowSeats, rowIndex) => (
          <div
            key={`${title}-${rowIndex}`}
            className="flex items-center justify-center gap-6"
          >
            <div className="inline-flex items-center gap-2">
              {rowSeats.slice(0, 1).map((seat) => (
                <SeatButton
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeats.includes(seat.id)}
                  onClick={() => onSeatClick(seat)}
                />
              ))}
            </div>
            <div className="inline-flex items-center gap-2">
              {rowSeats.slice(1).map((seat) => (
                <SeatButton
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeats.includes(seat.id)}
                  onClick={() => onSeatClick(seat)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeatSelection;
