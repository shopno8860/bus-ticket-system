import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import {
  cancelAdminTrip,
  createAdminTrip,
  getAdminBuses,
  getAdminRoutes,
  getAdminTrips,
  updateAdminTrip,
} from '../services/adminApi';

const TRIP_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

const defaultTripForm = {
  busId: '',
  routeId: '',
  departureTime: '',
  arrivalTime: '',
  price: '',
};

function TripPage() {
  const { data, error, loading, execute } = useFetch(getAdminTrips);
  const { data: busData, loading: busLoading } = useFetch(getAdminBuses);
  const { data: routeData, loading: routeLoading } = useFetch(getAdminRoutes);

  const [filters, setFilters] = useState({
    date: '',
    routeId: '',
    status: '',
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [formData, setFormData] = useState(defaultTripForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [tripToCancel, setTripToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const trips = Array.isArray(data) ? data : [];
  const buses = Array.isArray(busData) ? busData : [];
  const routes = Array.isArray(routeData) ? routeData : [];

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const tripRouteId = trip.routeId ?? trip.route?.id ?? '';
      const tripDate = getDateValue(trip.departureTime);

      if (filters.date && tripDate !== filters.date) return false;
      if (filters.routeId && tripRouteId !== filters.routeId) return false;
      if (filters.status && trip.status !== filters.status) return false;

      return true;
    });
  }, [trips, filters.date, filters.routeId, filters.status]);

  const openAddDrawer = () => {
    setEditingTrip(null);
    setFormData(defaultTripForm);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditDrawer = (trip) => {
    setEditingTrip(trip);
    setFormData({
      busId: trip.busId ?? trip.bus?.id ?? '',
      routeId: trip.routeId ?? trip.route?.id ?? '',
      departureTime: toDateTimeInput(trip.departureTime),
      arrivalTime: toDateTimeInput(trip.arrivalTime),
      price: trip.price ?? '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormDrawer = () => {
    setIsFormOpen(false);
    setEditingTrip(null);
    setFormData(defaultTripForm);
    setFormError('');
  };

  const validateTripForm = () => {
    if (
      !formData.busId ||
      !formData.routeId ||
      !formData.departureTime ||
      !formData.arrivalTime ||
      String(formData.price).trim() === ''
    ) {
      return 'All fields are required.';
    }

    const departure = new Date(formData.departureTime);
    const arrival = new Date(formData.arrivalTime);
    if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
      return 'Please provide valid departure and arrival times.';
    }
    if (arrival <= departure) {
      return 'Arrival time must be after departure time.';
    }
    if (Number(formData.price) < 0 || Number.isNaN(Number(formData.price))) {
      return 'Price must be a valid non-negative number.';
    }

    return '';
  };

  const handleSaveTrip = async (event) => {
    event.preventDefault();
    const validationMessage = validateTripForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const payload = {
      busId: formData.busId,
      routeId: formData.routeId,
      departureTime: new Date(formData.departureTime).toISOString(),
      arrivalTime: new Date(formData.arrivalTime).toISOString(),
      price: Number(formData.price),
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editingTrip?.id) {
        await updateAdminTrip(editingTrip.id, {
          busId: payload.busId,
          routeId: payload.routeId,
          departureTime: payload.departureTime,
          arrivalTime: payload.arrivalTime,
          price: payload.price,
        });
        showToast('success', 'Trip updated successfully.');
      } else {
        await createAdminTrip(payload);
        showToast('success', 'Trip created successfully.');
      }
      await execute();
      closeFormDrawer();
    } catch (err) {
      const message = err?.message || 'Failed to save trip.';
      setFormError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCancelModal = (trip) => {
    setTripToCancel(trip);
    setCancelReason('');
    setCancelError('');
    setIsCancelOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelOpen(false);
    setTripToCancel(null);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancelTrip = async () => {
    if (!tripToCancel?.id) return;
    if (!cancelReason.trim()) {
      setCancelError('Cancellation reason is required.');
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await cancelAdminTrip(tripToCancel.id, cancelReason.trim());
      showToast('success', 'Trip cancelled successfully.');
      await execute();
      closeCancelModal();
    } catch (err) {
      const message = err?.message || 'Failed to cancel trip.';
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
          <h1 className="text-xl font-semibold text-slate-900">Trip Management</h1>
          <p className="text-sm text-slate-500">Manage all trips efficiently</p>
        </div>
        <button
          type="button"
          onClick={openAddDrawer}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          Add Trip
        </button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
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

          <FilterField label="Status">
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All status</option>
              {TRIP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading || busLoading || routeLoading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <IconSpinner />
          </div>
        ) : error ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message || 'Failed to load trips.'}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No trips found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Bus</th>
                  <th className="px-3 py-2 font-medium">Route</th>
                  <th className="px-3 py-2 font-medium">Departure</th>
                  <th className="px-3 py-2 font-medium">Arrival</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="border-b border-slate-100 text-sm transition hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{trip.bus?.name ?? '-'}</p>
                      <p className="text-xs text-gray-500">{trip.bus?.operatorName ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {trip.route?.origin ?? '-'} {'->'} {trip.route?.destination ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(trip.departureTime)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(trip.arrivalTime)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatPrice(trip.price)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={trip.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(trip)}
                          title="Edit Trip"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => openCancelModal(trip)}
                          disabled={trip.status === 'CANCELLED'}
                          title="Cancel Trip"
                          className="rounded-md border border-slate-200 p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <IconCancel />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <button
            type="button"
            aria-label="Close panel"
            className="h-full flex-1 cursor-default"
            onClick={closeFormDrawer}
          />
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              {editingTrip ? 'Edit Trip' : 'Add Trip'}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={handleSaveTrip}>
              <SelectField
                label="Bus"
                value={formData.busId}
                onChange={(value) => setFormData((prev) => ({ ...prev, busId: value }))}
                options={buses.map((bus) => ({
                  value: bus.id,
                  label: `${bus.name ?? bus.busName} - ${bus.operatorName ?? 'Unknown operator'}`,
                }))}
                placeholder="Select bus"
              />

              <SelectField
                label="Route"
                value={formData.routeId}
                onChange={(value) => setFormData((prev) => ({ ...prev, routeId: value }))}
                options={routes.map((route) => ({
                  value: route.id,
                  label: `${route.origin} -> ${route.destination}`,
                }))}
                placeholder="Select route"
              />

              <InputField
                label="Departure Time"
                type="datetime-local"
                value={formData.departureTime}
                onChange={(value) => setFormData((prev) => ({ ...prev, departureTime: value }))}
              />

              <InputField
                label="Arrival Time"
                type="datetime-local"
                value={formData.arrivalTime}
                onChange={(value) => setFormData((prev) => ({ ...prev, arrivalTime: value }))}
              />

              <InputField
                label="Price"
                type="number"
                value={formData.price}
                onChange={(value) => setFormData((prev) => ({ ...prev, price: value }))}
                min={0}
                step="0.01"
              />

              {formError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeFormDrawer}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCancelOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Cancel Trip</h2>
            <p className="mt-1 text-sm text-slate-600">Please provide a cancellation reason.</p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Cancel Reason
              </span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
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
                onClick={handleCancelTrip}
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

function FilterField({ label, children }) {
  return (
    <label className="min-w-[170px] flex-1">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function InputField({ label, value, onChange, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        {...props}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, placeholder, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }) {
  const colorMap = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
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

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDateValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function IconEdit() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M15.232 2.232a2.5 2.5 0 1 1 3.536 3.536l-9.1 9.1a2 2 0 0 1-.848.497l-3.17.906a.75.75 0 0 1-.928-.928l.905-3.17a2 2 0 0 1 .498-.848l9.107-9.093Z" />
      <path d="M3.5 5.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H5v10h10v-5.25a.75.75 0 0 1 1.5 0V17a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V5.75Z" />
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

export default TripPage;
