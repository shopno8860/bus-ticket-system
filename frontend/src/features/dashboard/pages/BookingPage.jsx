import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../../config';
import { useFetch } from '../../../hooks/useFetch';
import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';
import { getDashboardBookingRoutes, withOperatorQuery } from '../services/dashboardApi';
import { useDashboardScope } from '../hooks/useDashboardScope';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useOperatorHubPaths } from '../hooks/useOperatorHubPaths';

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];

/** Any confirmed booking can be printed from the dashboard (admin, operator, staff, or online). */
function canPrintBooking(booking) {
  return booking?.status === 'CONFIRMED';
}

function BookingPage() {
  const navigate = useNavigate();
  const { bookingConfirm } = useOperatorHubPaths();
  const { operatorId, isPlatformReadOnly } = useDashboardScope();

  const openPrintTicket = useCallback(
    (booking) => {
      navigate(bookingConfirm, { state: { booking } });
    },
    [navigate, bookingConfirm],
  );
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    routeId: '',
    search: '',
  });

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const bookingQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.date) params.set('date', filters.date);
    if (filters.routeId) params.set('route', filters.routeId);
    return params.toString();
  }, [filters.date, filters.routeId, filters.search, filters.status]);

  const fetchBookings = useCallback(async () => {
    const params = new URLSearchParams(bookingQuery);
    if (operatorId) {
      params.set('operatorId', operatorId);
    }
    const url = params.toString()
      ? `${endpoints.dashboard.bookings}?${params}`
      : withOperatorQuery(endpoints.dashboard.bookings, operatorId);
    return apiFetch(url).then((res) => res.items ?? res);
  }, [bookingQuery, operatorId]);

  const {
    data: bookingData,
    error: bookingError,
    loading: bookingLoading,
    execute: refetch,
  } = useFetch(fetchBookings);

  const loadRoutes = useCallback(
    () => getDashboardBookingRoutes(operatorId),
    [operatorId],
  );
  const { data: routeData } = useFetch(loadRoutes);

  const bookings = Array.isArray(bookingData) ? bookingData : [];
  const routes = Array.isArray(routeData) ? routeData : [];
  const filteredBookings = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const statusOk = !filters.status || booking.status === filters.status;
      if (!statusOk) return false;
      if (!q) return true;
      const ref = String(booking.bookingReference ?? '').toLowerCase();
      const phone = String(
        booking.user?.phoneNumber ?? booking.user?.phone ?? booking.passengerPhone ?? booking.phone ?? '',
      ).toLowerCase();
      return ref.includes(q) || phone.includes(q);
    });
  }, [bookings, filters.search, filters.status]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const closeCancelModal = () => {
    setBookingToCancel(null);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel?.id) return;
    if (!cancelReason.trim()) {
      setCancelError('Cancellation reason is required.');
      return;
    }

    setCancelling(true);
    setCancelError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${config.apiBaseUrl}${endpoints.dashboard.cancelBooking(bookingToCancel.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!response.ok) {
        let message = 'Failed to cancel booking.';
        try {
          const err = await response.json();
          message = err?.message || message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      await refetch();
      closeCancelModal();
      showToast('success', 'Booking cancelled successfully.');
    } catch (err) {
      const message = err?.message || 'Failed to cancel booking.';
      setCancelError(message);
      showToast('error', message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Booking Management</h1>
          <p className="text-sm text-slate-500">View and manage all bookings</p>
        </div>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Search by reference or phone"
          className="w-full max-w-xs rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </section>

      {isPlatformReadOnly ? <ReadOnlyBanner /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <FilterField label="Status">
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All status</option>
              {BOOKING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Date">
            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </FilterField>

          <FilterField label="Route">
            <select
              value={filters.routeId}
              onChange={(event) => setFilters((prev) => ({ ...prev, routeId: event.target.value }))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.origin} {'->'} {route.destination}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {bookingLoading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <IconSpinner />
          </div>
        ) : bookingError ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {bookingError.message || 'Failed to load bookings.'}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Booking Ref</th>
                  <th className="px-3 py-2 font-medium">Passenger</th>
                  <th className="px-3 py-2 font-medium">Trip Info</th>
                  <th className="px-3 py-2 font-medium">Seats</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Discount</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100 align-top transition hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="text-sm font-semibold text-slate-800">{booking.bookingReference ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">
                        {booking.user?.fullName ?? booking.user?.name ?? booking.passengerName ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {booking.user?.phoneNumber ?? booking.user?.phone ?? booking.passengerPhone ?? booking.phone ?? '-'}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{booking.trip?.bus?.name ?? '-'}</p>
                      <p className="text-xs text-slate-500">
                        {booking.trip?.operator?.name ?? booking.trip?.bus?.operatorName ?? '-'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {booking.trip?.route?.origin ?? '-'} {'->'} {booking.trip?.route?.destination ?? '-'}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(booking.trip?.departureTime)}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatSeats(booking.bookingSeats)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatAmount(booking.finalAmount || booking.totalAmount || booking.amount || booking.trip?.price)}
                      {booking.discountAmount > 0 && (
                        <p className="text-[10px] text-green-600">
                          Orig: {formatAmount(booking.totalAmount)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {booking.discountAmount > 0 ? (
                        <span className="text-xs text-green-600 font-medium">
                          -{formatAmount(booking.discountAmount)}
                          {booking.discountType === 'PERCENTAGE' && ` (${booking.discountValue}%)`}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <SourceBadge source={booking.bookingSource} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="View Details"
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                        >
                          <IconView />
                        </button>
                        {canPrintBooking(booking) && (
                          <button
                            type="button"
                            title="Print Ticket"
                            onClick={() => openPrintTicket(booking)}
                            className="rounded-md border border-slate-200 p-1.5 text-emerald-600 transition hover:bg-emerald-50"
                          >
                            <IconPrint />
                          </button>
                        )}
                        {!isPlatformReadOnly ? (
                          <button
                            type="button"
                            title="Cancel Booking"
                            onClick={() => setBookingToCancel(booking)}
                            disabled={booking.status === 'CANCELLED' || booking.status === 'EXPIRED'}
                            className="rounded-md border border-slate-200 p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <IconCancel />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedBooking ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <button
            type="button"
            aria-label="Close details panel"
            className="h-full flex-1 cursor-default"
            onClick={() => setSelectedBooking(null)}
          />
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Booking Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Booking Reference" value={selectedBooking.bookingReference} />
              <DetailRow
                label="Passenger"
                value={`${selectedBooking.user?.fullName ?? selectedBooking.user?.name ?? selectedBooking.passengerName ?? '-'} (${selectedBooking.user?.phoneNumber ?? selectedBooking.user?.phone ?? selectedBooking.passengerPhone ?? '-'})`}
              />
              <DetailRow
                label="Trip"
                value={`${selectedBooking.trip?.bus?.name ?? '-'} | ${selectedBooking.trip?.route?.origin ?? '-'} -> ${selectedBooking.trip?.route?.destination ?? '-'} | ${formatDateTime(selectedBooking.trip?.departureTime)}`}
              />
              <DetailRow label="Seats" value={formatSeats(selectedBooking.bookingSeats)} />
              <DetailRow label="Booking Source" value={formatBookingSource(selectedBooking.bookingSource)} />
              {selectedBooking.discountAmount > 0 && (
                <>
                  <DetailRow label="Discount Type" value={selectedBooking.discountType === 'PERCENTAGE' ? `Percentage (${selectedBooking.discountValue}%)` : `Fixed (${formatAmount(selectedBooking.discountValue)})`} />
                  <DetailRow label="Discount Amount" value={formatAmount(selectedBooking.discountAmount)} />
                  <DetailRow label="Original Fare" value={formatAmount(selectedBooking.totalAmount)} />
                  <DetailRow label="Final Amount" value={formatAmount(selectedBooking.finalAmount)} />
                </>
              )}
              <DetailRow
                label="Payment"
                value={formatPayment(selectedBooking.payments?.[0] ?? selectedBooking.payment)}
              />
              <DetailRow
                label="Refund"
                value={formatRefund(selectedBooking.refunds?.[0] ?? selectedBooking.refund)}
              />
              {canPrintBooking(selectedBooking) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBooking(null);
                      openPrintTicket(selectedBooking);
                    }}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                  >
                    Print Ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {bookingToCancel ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Cancel Booking</h2>
            <p className="mt-1 text-sm text-slate-600">
              Booking: <span className="font-medium">{bookingToCancel.bookingReference ?? '-'}</span>
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Cancel Reason
              </span>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {cancelError ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {cancelError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

function formatBookingSource(source) {
  switch (source) {
    case 'ADMIN_BOOKING':
      return 'Admin (manual)';
    case 'STAFF_BOOKING':
      return 'Operator / Staff (manual)';
    case 'MANUAL':
      return 'Manual';
    case 'USER_BOOKING':
    default:
      return 'Online (user)';
  }
}

function SourceBadge({ source }) {
  if (source === 'ADMIN_BOOKING') {
    return (
      <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
        ADMIN
      </span>
    );
  }
  if (source === 'STAFF_BOOKING' || source === 'MANUAL') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
        MANUAL
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
      USER
    </span>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="min-w-[170px] flex-1">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-slate-800">{value || '-'}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const colorMap = {
    PENDING: 'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
    EXPIRED: 'bg-slate-100 text-slate-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorMap[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status ?? 'UNKNOWN'}
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatAmount(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '৳ 0';
  return `৳ ${amount.toLocaleString('en-BD')}`;
}

function formatSeats(bookingSeats) {
  if (!Array.isArray(bookingSeats) || bookingSeats.length === 0) return '-';
  return bookingSeats
    .map((item) => item?.seat?.seatNumber ?? item?.seatNumber ?? item?.seatNo)
    .filter(Boolean)
    .join(', ');
}

function formatPayment(payment) {
  if (!payment) return 'No payment record';
  const method = payment.method || payment.paymentMethod || 'Unknown';
  const status = payment.status || 'Unknown';
  return `${method} | ${status}`;
}

function formatRefund(refund) {
  if (!refund) return 'No refund';
  return `${refund.status ?? 'Unknown'}${refund.reason ? ` | ${refund.reason}` : ''}`;
}

function IconView() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 4.5c4.2 0 7.32 2.766 8.5 5.5-1.18 2.734-4.3 5.5-8.5 5.5S2.68 12.734 1.5 10c1.18-2.734 4.3-5.5 8.5-5.5Zm0 2c-2.745 0-4.973 1.58-6.18 3.5 1.207 1.92 3.435 3.5 6.18 3.5s4.973-1.58 6.18-3.5c-1.207-1.92-3.435-3.5-6.18-3.5Zm0 1.75a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M5 2.5A1.5 1.5 0 0 1 6.5 1h7A1.5 1.5 0 0 1 15 2.5v3H5v-3ZM3 5.5A1.5 1.5 0 0 0 1.5 7v5A1.5 1.5 0 0 0 3 13.5h1.5v-1.5A1.5 1.5 0 0 1 6 10.5h8a1.5 1.5 0 0 1 1.5 1.5v1.5H17a1.5 1.5 0 0 0 1.5-1.5V7A1.5 1.5 0 0 0 17 5.5H3Zm2 6.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-4ZM6 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}

function IconCancel() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM6.28 6.28a.75.75 0 0 1 1.06 0L10 8.94l2.66-2.66a.75.75 0 1 1 1.06 1.06L11.06 10l2.66 2.66a.75.75 0 1 1-1.06 1.06L10 11.06l-2.66 2.66a.75.75 0 1 1-1.06-1.06L8.94 10 6.28 7.34a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin text-slate-500">
      <circle cx="12" cy="12" r="10" className="stroke-current opacity-25" strokeWidth="4" fill="none" />
      <path className="fill-current opacity-90" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

export default BookingPage;
