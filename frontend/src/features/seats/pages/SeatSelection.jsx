import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { tripApi } from "../../trips/services/tripApi";
import { lockSeats } from "../../bookings/services/bookingApi";

const SeatSelection = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchTripDetails = async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await tripApi.getTripDetails(tripId);
        if (!isMounted) return;
        setTripData(data);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch trip details:", err);
        if (!silent) {
          alert("Failed to load trip details. Please try again.");
        }
      } finally {
        if (isMounted && !silent) {
          setLoading(false);
        }
      }
    };

    fetchTripDetails();

    // Keep seat states fresh so users can see locked seats quickly.
    const refreshTimer = setInterval(() => {
      fetchTripDetails({ silent: true });
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, [tripId]);

  const allSeats = useMemo(() => {
    if (!tripData || !tripData.bus || !tripData.bus.seats) return [];

    const now = Date.now();
    const seatStatusById = new Map();
    for (const bookingSeat of tripData.bookingSeats || []) {
      if (bookingSeat.status === "RESERVED") {
        seatStatusById.set(bookingSeat.seatId, "reserved");
        continue;
      }

      if (
        bookingSeat.status === "LOCKED" &&
        bookingSeat.lockExpiresAt &&
        new Date(bookingSeat.lockExpiresAt).getTime() > now
      ) {
        seatStatusById.set(bookingSeat.seatId, "locked");
      }
    }

    return tripData.bus.seats.map((seat) => ({
      ...seat,
      seatState: seatStatusById.get(seat.id) || "available",
    }));
  }, [tripData]);

  const PRICE_PER_SEAT = tripData ? parseFloat(tripData.price) : 0;

  const handleSeatClick = (seat) => {
    if (seat.seatState === "reserved") {
      alert("This seat is already reserved.");
      return;
    }
    if (seat.seatState === "locked") {
      alert("This seat is temporarily locked by another user.");
      return;
    }
    setSelectedSeats((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((s) => s !== seat.id);
      } else {
        if (prev.length >= 4) {
          alert("Maximum 4 seats selectable");
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
    if (selectedSeats.length === 0) return;
    
    try {
      setLoading(true);
      const lockResponse = await lockSeats({
        tripId,
        seatIds: selectedSeats,
      });
      
      const { lockExpiresAt } = lockResponse;
      
      // Get seat numbers for display
      const selectedSeatDetails = allSeats.filter(s => selectedSeats.includes(s.id));
      
      navigate("/booking", {
        state: {
          tripId,
          selectedSeats: selectedSeats, // These are UUIDs/CUIDs
          selectedSeatNumbers: selectedSeatDetails.map(s => s.seatNumber),
          seatPrice: PRICE_PER_SEAT,
          busType: tripData.bus.busType,
          lockExpiresAt, // Pass the expiry time
        },
      });
    } catch (err) {
      console.error("Failed to lock seats:", err);
      alert(err.message || "Failed to reserve seats. They might have been taken.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
            disabled={selectedSeats.length === 0}
            className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-sm tracking-widest disabled:bg-gray-100 disabled:text-gray-300 transition-all active:scale-[0.98] shadow-lg shadow-green-100 uppercase"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
};

// Seat Button Component
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
