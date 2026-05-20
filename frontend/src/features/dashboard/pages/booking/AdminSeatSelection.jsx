import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../../../services/api';
import SeatGrid from '../../../../components/seats/SeatGrid';
import { useOperatorHubPaths } from '../../hooks/useOperatorHubPaths';

function AdminSeatSelection() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingSummary } = useOperatorHubPaths();

  const trip = location.state?.trip;

  const [tripData, setTripData] = useState(trip || null);
  const [loading, setLoading] = useState(!trip);
  const [error, setError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);

  useEffect(() => {
    if (trip && trip.bus?.seats) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTripDetails = async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch(`/trips/${tripId}`);
        if (!isMounted) return;
        setTripData(data);
        setError('');
      } catch (err) {
        if (!isMounted) return;
        if (!silent) {
          setError(err.message || 'Failed to load trip details');
        }
      } finally {
        if (isMounted && !silent) setLoading(false);
      }
    };

    fetchTripDetails();

    const refreshTimer = setInterval(() => {
      fetchTripDetails({ silent: true });
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(refreshTimer);
    };
  }, [tripId, trip]);

  const allSeats = useMemo(() => {
    if (!tripData?.bus?.seats) return [];
    const now = Date.now();
    const seatStatusById = new Map();
    for (const bs of tripData.bookingSeats || []) {
      if (bs.status === 'RESERVED') {
        seatStatusById.set(bs.seatId, 'reserved');
      } else if (bs.status === 'LOCKED' && bs.lockExpiresAt && new Date(bs.lockExpiresAt).getTime() > now) {
        seatStatusById.set(bs.seatId, 'locked');
      }
    }
    return tripData.bus.seats.map((seat) => ({
      ...seat,
      seatState: seatStatusById.get(seat.id) || 'available',
    }));
  }, [tripData]);

  const PRICE_PER_SEAT = tripData ? parseFloat(tripData.price) : 0;
  const busClass = tripData?.bus?.busClass ?? 'ECONOMY';
  const busType = tripData?.bus?.busType ?? 'NON_AC';

  const selectedSeatDetails = useMemo(
    () => allSeats.filter((s) => selectedSeats.includes(s.id)),
    [allSeats, selectedSeats],
  );

  const totalPrice = selectedSeats.length * PRICE_PER_SEAT;

  const MAX_SELECTABLE = 10;

  const handleSeatClick = (seat) => {
    if (seat.seatState === 'reserved' || seat.seatState === 'locked') return;
    setSelectedSeats((prev) => {
      if (prev.includes(seat.id)) return prev.filter((s) => s !== seat.id);
      if (prev.length >= MAX_SELECTABLE) return prev;
      return [...prev, seat.id];
    });
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) return;
    navigate(bookingSummary, {
      state: {
        trip: tripData,
        tripId,
        selectedSeats,
        selectedSeatNumbers: selectedSeatDetails.map((s) => s.seatNumber),
        seatPrice: PRICE_PER_SEAT,
        busType,
        busClass,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-slate-50 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin text-slate-400">
            <circle cx="12" cy="12" r="10" className="stroke-current opacity-25" strokeWidth="4" fill="none" />
            <path className="fill-current opacity-90" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">Loading seat layout...</p>
        </div>
      </div>
    );
  }

  if (error && !tripData) {
    return (
      <div className="flex items-center justify-center bg-slate-50 min-h-[400px]">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-red-500">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 mb-3">{error}</p>
          <button onClick={() => navigate(-1)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="flex items-center justify-center bg-slate-50 min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-500 mb-3">Trip data not available</p>
          <button onClick={() => navigate(-1)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Select Seats</h1>
          <p className="text-sm text-slate-500">
            {tripData.route?.origin} &rarr; {tripData.route?.destination}
            <span className="mx-1.5 text-slate-300">|</span>
            {tripData.bus?.name} ({busType} / {busClass})
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Seat Grid */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Legend */}
          <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded bg-gray-100 border border-gray-200"></span> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded bg-emerald-600"></span> Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded bg-orange-100 border border-orange-200"></span> Locked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded bg-red-100 border border-red-200"></span> Reserved
            </span>
          </div>

          {allSeats.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">
              No seats configured for this bus
            </div>
          ) : (
            <SeatGrid
              allSeats={allSeats}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
              busClass={busClass}
              busType={busType}
              maxSelectable={10}
            />
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-fit space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Selected Seats
          </h2>

          {selectedSeatDetails.length === 0 ? (
            <p className="text-sm text-slate-400">Click on available seats to select</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedSeatDetails.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"
                >
                  {s.seatNumber}
                  <button
                    onClick={() => setSelectedSeats((prev) => prev.filter((id) => id !== s.id))}
                    className="ml-1.5 text-emerald-400 hover:text-emerald-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Seats Selected</span>
              <span className="font-semibold text-slate-800">{selectedSeats.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Price per seat</span>
              <span className="font-semibold text-slate-800">{formatPrice(PRICE_PER_SEAT)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
              <span className="font-bold text-slate-800">Total Fare</span>
              <span className="text-lg font-bold text-emerald-600">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={selectedSeats.length === 0}
            className="w-full rounded-lg bg-[#0f172a] py-3 text-sm font-bold text-white uppercase tracking-wider transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
          >
            Continue to Booking
          </button>
        </div>
      </div>
    </div>
  );
}

function formatPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '-';
  return `\u09F3 ${amount.toLocaleString('en-BD')}`;
}

export default AdminSeatSelection;
