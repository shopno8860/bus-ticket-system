import { useCallback, useEffect, useState } from 'react';
import {
  createDashboardBoardingPoint,
  createDashboardDroppingPoint,
  deleteDashboardBoardingPoint,
  deleteDashboardDroppingPoint,
  getDashboardRoutePoints,
  updateDashboardBoardingPoint,
  updateDashboardDroppingPoint,
} from '../services/dashboardApi';

const emptyForm = { name: '', address: '', isActive: true };

function RoutePointsPanel({ route, readOnly = false, operatorId, onClose }) {
  const [points, setPoints] = useState({ boardingPoints: [], droppingPoints: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [formType, setFormType] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadPoints = useCallback(async () => {
    if (!route?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getDashboardRoutePoints(route.id, {
        operatorId,
        includeInactive: !readOnly,
      });
      setPoints({
        boardingPoints: Array.isArray(res?.boardingPoints) ? res.boardingPoints : [],
        droppingPoints: Array.isArray(res?.droppingPoints) ? res.droppingPoints : [],
      });
    } catch (err) {
      setError(err?.message || 'Failed to load route points');
    } finally {
      setLoading(false);
    }
  }, [route?.id, operatorId, readOnly]);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2500);
  };

  const openCreate = (type) => {
    setFormType(type);
    setEditing(null);
    setForm(emptyForm);
  };

  const openEdit = (type, point) => {
    setFormType(type);
    setEditing(point);
    setForm({
      name: point.name ?? '',
      address: point.address ?? '',
      isActive: point.isActive !== false,
    });
  };

  const closeForm = () => {
    setFormType(null);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const address = form.address.trim();
    if (!name || !address) {
      setError('Name and address are required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        routeId: route.id,
        name,
        address,
        isActive: form.isActive,
      };

      if (formType === 'boarding') {
        if (editing) {
          await updateDashboardBoardingPoint(editing.id, payload, operatorId);
          showToast('success', 'Boarding point updated');
        } else {
          await createDashboardBoardingPoint(payload, operatorId);
          showToast('success', 'Boarding point created');
        }
      } else if (editing) {
        await updateDashboardDroppingPoint(editing.id, payload, operatorId);
        showToast('success', 'Dropping point updated');
      } else {
        await createDashboardDroppingPoint(payload, operatorId);
        showToast('success', 'Dropping point created');
      }

      closeForm();
      await loadPoints();
    } catch (err) {
      setError(err?.message || 'Failed to save point');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type, point) => {
    if (!window.confirm(`Delete "${point.name}"?`)) return;
    setError('');
    try {
      if (type === 'boarding') {
        await deleteDashboardBoardingPoint(point.id, operatorId);
      } else {
        await deleteDashboardDroppingPoint(point.id, operatorId);
      }
      showToast('success', 'Point deleted');
      await loadPoints();
    } catch (err) {
      setError(err?.message || 'Failed to delete point');
    }
  };

  const routeLabel = `${route?.origin ?? ''} → ${route?.destination ?? ''}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button
        type="button"
        aria-label="Close"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
      />
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Route Points</h2>
            <p className="text-xs text-slate-500">{routeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-500">Loading points...</p>
          ) : (
            <>
              <PointsSection
                title="Boarding Points"
                points={points.boardingPoints}
                readOnly={readOnly}
                onAdd={() => openCreate('boarding')}
                onEdit={(p) => openEdit('boarding', p)}
                onDelete={(p) => handleDelete('boarding', p)}
              />
              <PointsSection
                title="Dropping Points"
                points={points.droppingPoints}
                readOnly={readOnly}
                onAdd={() => openCreate('dropping')}
                onEdit={(p) => openEdit('dropping', p)}
                onDelete={(p) => handleDelete('dropping', p)}
              />
            </>
          )}

          {formType ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-slate-800">
                {editing ? 'Edit' : 'Add'}{' '}
                {formType === 'boarding' ? 'Boarding' : 'Dropping'} Point
              </h3>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Address</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2"
                  required
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active (available for booking)
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-[#0f172a] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {toast ? (
          <div className="border-t border-slate-100 px-4 py-2">
            <p
              className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {toast.message}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PointsSection({ title, points, readOnly, onAdd, onEdit, onDelete }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {!readOnly ? (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Add
          </button>
        ) : null}
      </div>
      {points.length === 0 ? (
        <p className="text-xs text-slate-500">No points configured.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {points.map((point) => (
            <li
              key={point.id}
              className="flex items-start justify-between gap-2 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-800">
                  {point.name}
                  {point.isActive === false ? (
                    <span className="ml-2 text-[10px] uppercase text-amber-600">Inactive</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">{point.address}</p>
              </div>
              {!readOnly ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(point)}
                    className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(point)}
                    className="rounded border border-rose-200 px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RoutePointsPanel;
