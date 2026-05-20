import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import {
  createDashboardRoute,
  deleteDashboardRoute,
  getDashboardRoutes,
  updateDashboardRoute,
} from '../services/dashboardApi';
import { useDashboardScope } from '../hooks/useDashboardScope';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

const defaultForm = {
  origin: '',
  destination: '',
};

function normalizeCity(value) {
  return value.trim().toLowerCase();
}

function RoutePage() {
  const { operatorId, isPlatformReadOnly } = useDashboardScope();
  const loadRoutes = useCallback(
    () => getDashboardRoutes(operatorId),
    [operatorId],
  );
  const { data, error, loading, execute } = useFetch(loadRoutes);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const routes = Array.isArray(data) ? data : [];

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const routePairs = useMemo(
    () =>
      routes.map((route) => ({
        id: route.id,
        origin: normalizeCity(route.origin ?? ''),
        destination: normalizeCity(route.destination ?? ''),
      })),
    [routes],
  );

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingRoute(null);
    setFormError('');
  };

  const openFormDrawer = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditDrawer = (route) => {
    setEditingRoute(route);
    setFormData({
      origin: route.origin ?? '',
      destination: route.destination ?? '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormDrawer = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const validateForm = () => {
    const origin = formData.origin.trim();
    const destination = formData.destination.trim();

    if (!origin || !destination) {
      return 'Origin and destination are required.';
    }

    if (normalizeCity(origin) === normalizeCity(destination)) {
      return 'Origin and destination cannot be the same.';
    }

    const duplicate = routePairs.some(
      (route) =>
        route.origin === normalizeCity(origin) &&
        route.destination === normalizeCity(destination) &&
        route.id !== editingRoute?.id,
    );
    if (duplicate) {
      return 'Route already exists for this origin and destination.';
    }

    return '';
  };

  const handleSaveRoute = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const payload = {
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      ...(operatorId && !editingRoute ? { operatorId } : {}),
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editingRoute?.id) {
        await updateDashboardRoute(editingRoute.id, payload);
        showToast('success', 'Route updated successfully.');
      } else {
        await createDashboardRoute(payload);
        showToast('success', 'Route created successfully.');
      }
      await execute();
      closeFormDrawer();
    } catch (err) {
      const message = err?.message || 'Failed to save route.';
      setFormError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (route) => {
    setRouteToDelete(route);
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteOpen(false);
    setRouteToDelete(null);
  };

  const handleDeleteRoute = async () => {
    if (!routeToDelete?.id) return;
    setDeleting(true);
    try {
      await deleteDashboardRoute(routeToDelete.id);
      showToast('success', 'Route deleted successfully.');
      await execute();
      closeDeleteDialog();
    } catch (err) {
      showToast('error', err?.message || 'Failed to delete route.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Route Management</h1>
          <p className="text-sm text-slate-500">Manage routes between cities</p>
        </div>
        {!isPlatformReadOnly ? (
          <button
            type="button"
            onClick={openFormDrawer}
            className="rounded-md bg-[#0f172a] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1e293b]"
          >
            Add Route
          </button>
        ) : null}
      </section>

      {isPlatformReadOnly ? <ReadOnlyBanner /> : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-9 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message || 'Failed to load routes.'}
          </div>
        ) : routes.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No routes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Origin</th>
                  <th className="px-3 py-2 font-medium">Destination</th>
                  <th className="px-3 py-2 font-medium">Route Name</th>
                  <th className="px-3 py-2 font-medium">Created Date</th>
                  {!isPlatformReadOnly ? (
                    <th className="px-3 py-2 font-medium">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr key={route.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800">{route.origin}</td>
                    <td className="px-3 py-2 text-slate-700">{route.destination}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {route.origin} {'->'} {route.destination}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(route.createdAt)}</td>
                    {!isPlatformReadOnly ? (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(route)}
                            title="Edit Route"
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(route)}
                            title="Delete Route"
                            className="rounded-md border border-slate-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                          >
                            <IconDelete />
                          </button>
                        </div>
                      </td>
                    ) : null}
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
              {editingRoute ? 'Edit Route' : 'Add Route'}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={handleSaveRoute}>
              <InputField
                label="Origin"
                value={formData.origin}
                onChange={(value) => setFormData((prev) => ({ ...prev, origin: value }))}
              />
              <InputField
                label="Destination"
                value={formData.destination}
                onChange={(value) => setFormData((prev) => ({ ...prev, destination: value }))}
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
                  className="rounded-md bg-[#0f172a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1e293b] disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Delete Route</h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this route?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRoute}
                disabled={deleting}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <IconSpinner /> Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
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

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function IconEdit() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M15.232 2.232a2.5 2.5 0 1 1 3.536 3.536l-9.1 9.1a2 2 0 0 1-.848.497l-3.17.906a.75.75 0 0 1-.928-.928l.905-3.17a2 2 0 0 1 .498-.848l9.107-9.093Z" />
      <path d="M3.5 5.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H5v10h10v-5.25a.75.75 0 0 1 1.5 0V17a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V5.75Z" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M8.75 2.5a1.25 1.25 0 0 0-1.19.868L7.35 4H5.25a.75.75 0 0 0 0 1.5h.57l.74 10.36A2 2 0 0 0 8.556 17.75h2.888a2 2 0 0 0 1.996-1.89l.74-10.36h.57a.75.75 0 0 0 0-1.5h-2.1l-.21-.632a1.25 1.25 0 0 0-1.19-.868h-2.5Zm1 4.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6A.75.75 0 0 1 9.75 7Zm3.25.75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-white">
      <circle cx="12" cy="12" r="10" className="stroke-current opacity-25" strokeWidth="4" fill="none" />
      <path className="fill-current opacity-90" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

export default RoutePage;
