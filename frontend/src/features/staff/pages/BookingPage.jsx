import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';
import { getOperatorRoutes, getOperatorTrips, getOperatorBookings } from '../../operator/services/operatorApi';
import { getStaffStats } from '../services/staffApi';

function BookingPage() {
  const { data: routesData, loading: routesLoading } = useFetch(getOperatorRoutes);
  const { data: bookingsData, loading: bookingsLoading, execute: refreshBookings } = useFetch(getOperatorBookings, { immediate: false });

  const [selectedRoute, setSelectedRoute] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [trips, setTrips] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [seatsLoading, setSeatsLoading] = useState(false);

  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const routes = Array.isArray(routesData) ? routesData : [];
  const bookings = Array.isArray(bookingsData) ? bookingsData : [];

  useEffect(() => {
    refreshBookings().catch(() => {});
  }, [refreshBookings]);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const handleSearchTrips = useCallback(async () => {
    if (!selectedRoute || !departureDate) {
      setSearchError('Please select a route and departure date.');
      return;
    }
    setSearchError('');
    setSearching(true);
    setSelectedTrip(null);
    setSeats([]);
    setSelectedSeatIds([]);
    try {
      const route = routes.find((r) => r.id === selectedRoute);
      const params = new URLSearchParams({
        origin: route?.origin ?? '',
        destination: route?.destination ?? '',
        date: departureDate,
      });
      const data = await apiFetch(`${endpoints.trips.search}?${params}`);
      setTrips(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err) {
      setSearchError(err?.message || 'Failed to search trips.');
    } finally {
      setSearching(false);
    }
  }, [selectedRoute, departureDate, routes]);

  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    setSelectedSeatIds([]);
    setSeatsLoading(true);
    try {
      const data = await apiFetch(endpoints.seats.byBus(trip.busId ?? trip.bus?.id));
      setSeats(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('error', err?.message || 'Failed to load seats.');
    } finally {
      setSeatsLoading(false);
    }
  };

  const toggleSeat = (seatId) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId],
    );
  };

  const subtotal = selectedTrip ? Number(selectedTrip.price ?? 0) * selectedSeatIds.length : 0;
  const discountAmount = (subtotal * Number(discountPercent || 0)) / 100;
  const total = subtotal - discountAmount;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTrip || selectedSeatIds.length === 0) {
      setFormError('Please select a trip and at least one seat.');
      return;
    }
    if (!passengerName.trim()) {
      setFormError('Passenger name is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await apiFetch('/staff/bookings', {
        method: 'POST',
        body: JSON.stringify({
          tripId: selectedTrip.id,
          seatIds: selectedSeatIds,
          passengerName: passengerName.trim(),
          passengerPhone: passengerPhone.trim(),
          discountPercent: Number(discountPercent || 0),
        }),
      });
      showToast('success', 'Booking created successfully.');
      setSelectedTrip(null);
      setSeats([]);
      setSelectedSeatIds([]);
      setPassengerName('');
      setPassengerPhone('');
      setDiscountPercent(0);
      await refreshBookings();
    } catch (err) {
      const message = err?.message || 'Failed to create booking.';
      setFormError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 p-4">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Book Ticket</h1>
        <p className="text-sm text-slate-500">Create confirmed bookings for passengers.</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Search Trips</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Route</span>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select route</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.origin} {'->'} {route.destination}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[170px] flex-1">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Departure Date</span>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={handleSearchTrips}
            disabled={searching || routesLoading}
            className="rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1e293b] disabled:opacity-60"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchError}</p>
        ) : null}
      </section>

      {trips.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Bus</th>
                  <th className="px-3 py-2 font-medium">Route</th>
                  <th className="px-3 py-2 font-medium">Departure</th>
                  <th className="px-3 py-2 font-medium">Arrival</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Available Seats</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr
                    key={trip.id}
                    className={`border-b border-slate-100 text-sm transition hover:bg-slate-50 ${
                      selectedTrip?.id === trip.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-800">{trip.bus?.name ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {trip.route?.origin ?? '-'} {'->'} {trip.route?.destination ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(trip.departureTime)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(trip.arrivalTime)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatPrice(trip.price)}</td>
                    <td className="px-3 py-2 text-slate-700">{trip.availableSeats ?? '-'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleSelectTrip(trip)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          selectedTrip?.id === trip.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#0f172a] text-white hover:bg-[#1e293b]'
                        }`}
                      >
                        {selectedTrip?.id === trip.id ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {selectedTrip ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Select Seats</h2>
          {seatsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#0f172a]" />
            </div>
          ) : seats.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No seats available for this bus.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {seats.map((seat) => {
                const isBooked = seat.isBooked ?? seat.status === 'BOOKED';
                const isSelected = selectedSeatIds.includes(seat.id);
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={isBooked}
                    onClick={() => toggleSeat(seat.id)}
                    className={`h-10 w-10 rounded-md text-xs font-medium transition ${
                      isBooked
                        ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                        : isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'border border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                    title={`Seat ${seat.seatNumber ?? seat.label ?? seat.id}`}
                  >
                    {seat.seatNumber ?? seat.label ?? seat.row}
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {selectedSeatIds.length} seat(s) selected.
          </p>
        </section>
      ) : null}

      {selectedTrip ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Passenger & Discount</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputField
                label="Passenger Name *"
                value={passengerName}
                onChange={setPassengerName}
                placeholder="Full name"
              />
              <InputField
                label="Passenger Phone"
                value={passengerPhone}
                onChange={setPassengerPhone}
                placeholder="Phone number"
              />
              <InputField
                label="Discount (%)"
                type="number"
                value={discountPercent}
                onChange={setDiscountPercent}
                min={0}
                max={100}
              />
              <div className="flex flex-col justify-end rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Subtotal: {formatPrice(subtotal)}</p>
                <p className="text-xs text-slate-500">Discount: {formatPrice(discountAmount)}</p>
                <p className="text-sm font-semibold text-slate-900">Total: {formatPrice(total)}</p>
              </div>
            </div>

            {formError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTrip(null);
                  setSeats([]);
                  setSelectedSeatIds([]);
                  setPassengerName('');
                  setPassengerPhone('');
                  setDiscountPercent(0);
                  setFormError('');
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting || selectedSeatIds.length === 0 || !passengerName.trim()}
                className="rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1e293b] disabled:opacity-60"
              >
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
          <h2 className="text-sm font-semibold text-slate-900">Recent Bookings</h2>
        </div>
        {bookingsLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-slate-500">No bookings yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Passenger</th>
                  <th className="px-3 py-2 font-medium">Route</th>
                  <th className="px-3 py-2 font-medium">Seats</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 10).map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{booking.bookingReference ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{booking.passengerName ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {booking.trip?.route?.origin ?? ''} {'->'} {booking.trip?.route?.destination ?? ''}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {booking.bookingSeats?.length ?? booking.seats?.length ?? '-'}
                    </td>
                    <td className="px-3 py-2">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatPrice(booking.totalAmount ?? booking.price)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(booking.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`rounded-md px-3 py-2 text-sm font-medium shadow-sm ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        {...props}
      />
    </label>
  );
}

function BookingStatusBadge({ status }) {
  const colorMap = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    EXPIRED: 'bg-slate-100 text-slate-500',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorMap[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '-';
  return `৳ ${amount.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export default BookingPage;
