import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createDashboardBooking, getDashboardRoutePoints } from '../../services/dashboardApi';
import { showError } from '../../../../utils/toastHelper';
import { useOperatorHubPaths } from '../../hooks/useOperatorHubPaths';
import { useDashboardScope } from '../../hooks/useDashboardScope';

function AdminBookingSummary() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { booking: bookingPath, bookingConfirm, bookingSeats } = useOperatorHubPaths();
  const { operatorId } = useDashboardScope();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [boardingPointId, setBoardingPointId] = useState('');
  const [droppingPointId, setDroppingPointId] = useState('');
  const [points, setPoints] = useState({ boardingPoints: [], droppingPoints: [] });

  const tripId = state?.tripId;
  const selectedSeats = state?.selectedSeats ?? [];

  void showError;
  void bookingSeats;

  if (!state) {
    return (
      <div className="flex items-center justify-center bg-slate-50 p-12">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No booking data found. Please select a trip first.</p>
          <button onClick={() => navigate(bookingPath)} className="rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white">
            Go to Trip Search
          </button>
        </div>
      </div>
    );
  }

  const { trip, selectedSeatNumbers, seatPrice } = state;
  const routeId = trip?.route?.id;

  useEffect(() => {
    if (!routeId) return;
    getDashboardRoutePoints(routeId, { operatorId })
      .then((res) => {
        const boardingPoints = Array.isArray(res?.boardingPoints) ? res.boardingPoints : [];
        const droppingPoints = Array.isArray(res?.droppingPoints) ? res.droppingPoints : [];
        setPoints({ boardingPoints, droppingPoints });
        if (boardingPoints.length === 1) {
          setBoardingPointId(boardingPoints[0].id);
        }
        if (droppingPoints.length === 1) {
          setDroppingPointId(droppingPoints[0].id);
        }
      })
      .catch(() => setPoints({ boardingPoints: [], droppingPoints: [] }));
  }, [routeId, operatorId]);

  const seatTotal = selectedSeats.length * seatPrice;

  const { discountAmount, finalAmount, discountError } = useMemo(() => {
    const result = { discountAmount: 0, finalAmount: seatTotal, discountError: '' };

    if (discountType === 'none' || !discountValue || Number(discountValue) <= 0) {
      return result;
    }

    const val = Number(discountValue);
    if (Number.isNaN(val) || val < 0) {
      result.discountError = 'Invalid discount value';
      return result;
    }

    if (discountType === 'PERCENTAGE') {
      if (val > 100) {
        result.discountError = 'Percentage discount cannot exceed 100%';
        return result;
      }
      result.discountAmount = (seatTotal * val) / 100;
    } else {
      result.discountAmount = val;
    }

    if (result.discountAmount > seatTotal) {
      result.discountError = 'Discount cannot exceed the total fare';
      result.discountAmount = 0;
      return result;
    }

    result.finalAmount = seatTotal - result.discountAmount;
    return result;
  }, [discountType, discountValue, seatTotal]);

  const handleBookTicket = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Please enter passenger name and phone');
      return;
    }
    if (!boardingPointId) {
      setError('Please select a boarding point');
      return;
    }
    if (!droppingPointId) {
      setError('Please select a dropping point');
      return;
    }

    if (discountError) {
      setError(discountError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        tripId,
        seatIds: selectedSeats,
        passengerName: name.trim(),
        passengerPhone: phone.trim(),
        boardingPointId,
        droppingPointId,
      };

      if (discountType !== 'none' && discountValue && Number(discountValue) > 0) {
        payload.discountType = discountType;
        payload.discountValue = Number(discountValue);
      }

      const result = await createDashboardBooking(payload);

      navigate(bookingConfirm, {
        state: { booking: result },
      });
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(bookingSeats(tripId), { replace: true });
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Booking Summary</h1>
          <p className="text-sm text-slate-500">Review booking details and confirm</p>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to Seats
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Trip Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase">Bus</p>
                <p className="font-semibold text-slate-800">{trip?.bus?.name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Route</p>
                <p className="font-semibold text-slate-800">{trip?.route?.origin ?? '-'} &rarr; {trip?.route?.destination ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Departure</p>
                <p className="font-semibold text-slate-800">{formatDateTime(trip?.departureTime)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Arrival</p>
                <p className="font-semibold text-slate-800">{formatDateTime(trip?.arrivalTime)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Selected Seats</h2>
            <div className="flex flex-wrap gap-2">
              {selectedSeatNumbers?.map((s) => (
                <span key={s} className="rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Passenger Information</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Passenger full name"
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Phone Number</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Passenger phone number"
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Boarding Point
                </span>
                <select
                  value={boardingPointId}
                  onChange={(e) => setBoardingPointId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select boarding point</option>
                  {points.boardingPoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Dropping Point
                </span>
                <select
                  value={droppingPointId}
                  onChange={(e) => setDroppingPointId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select dropping point</option>
                  {points.droppingPoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Price Details</h2>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Seat Total ({selectedSeats.length} &times; {formatPrice(seatPrice)})</span>
              <span className="font-semibold text-slate-800">{formatPrice(seatTotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">
                  Discount {discountType === 'PERCENTAGE' ? `(${discountValue}%)` : '(Fixed)'}
                </span>
                <span className="font-semibold text-green-600">-{formatPrice(discountAmount)}</span>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Final Amount</span>
                <span className="text-2xl font-bold text-emerald-600">{formatPrice(finalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Apply Discount (Optional)</h2>

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Discount Type</span>
              <select
                value={discountType}
                onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(''); }}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="none">No Discount</option>
                <option value="FIXED">Fixed Amount (BDT)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </label>

            {discountType !== 'none' && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {discountType === 'FIXED' ? 'Discount Amount (BDT)' : 'Discount Percentage (%)'}
                </span>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  min={0}
                  max={discountType === 'PERCENTAGE' ? 100 : seatTotal}
                  step="any"
                  placeholder={discountType === 'FIXED' ? 'Enter amount in BDT' : 'Enter percentage (0-100)'}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            )}

            {discountError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {discountError}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleBookTicket}
              disabled={loading || !!discountError}
              className="w-full rounded-md bg-emerald-600 py-3 text-sm font-bold text-white uppercase tracking-wider transition hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin">
                    <circle cx="12" cy="12" r="10" className="stroke-current opacity-25" strokeWidth="4" fill="none" />
                    <path className="fill-current" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                  </svg>
                  Booking...
                </span>
              ) : 'Book Ticket'}
            </button>

            <p className="text-[10px] text-center text-slate-400">
              Staff and operator bookings use ticket fare only (no platform or insurance fees).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '-';
  return `\u09F3 ${amount.toLocaleString('en-BD')}`;
}

export default AdminBookingSummary;
