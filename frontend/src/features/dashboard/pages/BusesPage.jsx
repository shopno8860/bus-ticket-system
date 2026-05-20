import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import OperatorSelect from '../components/OperatorSelect';
import { useDashboardScope } from '../hooks/useDashboardScope';
import {
  createDashboardBus,
  deleteDashboardBus,
  generateDashboardBusSeats,
  getDashboardBuses,
  updateDashboardBus,
} from '../services/dashboardApi';

const BUS_TYPES = ['AC', 'NON_AC', 'SLEEPER'];
const BUS_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
const BUS_CLASSES = ['BUSINESS', 'ECONOMY'];
const PAGE_SIZE = 8;

const defaultForm = {
  busName: '',
  operatorName: '',
  operatorId: '',
  registrationNumber: '',
  seatCapacity: 40,
  busType: 'AC',
  busClass: 'ECONOMY',
  status: 'ACTIVE',
};

function BusesPage() {
  const { requireOperatorOnCreate, showOperatorColumn } = useDashboardScope();
  const { data, error, loading, execute } = useFetch(getDashboardBuses);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [busToDelete, setBusToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [generatingBusId, setGeneratingBusId] = useState('');
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const toastTimerRef = useRef(null);

  const buses = Array.isArray(data) ? data : [];
  const totalPages = Math.max(1, Math.ceil(buses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedBuses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return buses.slice(start, start + PAGE_SIZE);
  }, [buses, currentPage]);

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

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingBus(null);
    setFormError('');
  };

  const openFormDrawer = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditDrawer = (bus) => {
    setEditingBus(bus);
    setFormData({
      busName: bus.name ?? bus.busName ?? '',
      operatorName: bus.operatorName ?? '',
      registrationNumber: bus.registrationNumber ?? '',
      seatCapacity: Number(bus.seatCapacity ?? 1),
      busType: bus.busType ?? 'AC',
      busClass: bus.busClass ?? 'ECONOMY',
      status: bus.status ?? 'ACTIVE',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormDrawer = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    if (field === 'busType') {
      setFormData((prev) => ({
        ...prev,
        busType: value,
        seatCapacity:
          value === 'SLEEPER' ? 36 : prev.busClass === 'BUSINESS' ? 28 : prev.seatCapacity,
      }));
      return;
    }

    if (field === 'busClass') {
      setFormData((prev) => ({
        ...prev,
        busClass: value,
        seatCapacity:
          prev.busType === 'SLEEPER' ? 36 : value === 'BUSINESS' ? 28 : prev.seatCapacity,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.busName.trim() || !formData.registrationNumber.trim()) {
      return 'Bus name and registration number are required.';
    }
    if (requireOperatorOnCreate && !editingBus && !formData.operatorId) {
      return 'Please select an operator.';
    }
    if (Number(formData.seatCapacity) <= 0 || Number.isNaN(Number(formData.seatCapacity))) {
      return 'Seat capacity must be greater than 0.';
    }
    return '';
  };

  const handleSaveBus = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const payload = {
      name: formData.busName.trim(),
      registrationNumber: formData.registrationNumber.trim(),
      ...(requireOperatorOnCreate && !editingBus
        ? { operatorId: formData.operatorId }
        : {}),
      seatCapacity:
        formData.busType === 'SLEEPER'
          ? 36
          : formData.busClass === 'BUSINESS'
            ? 28
            : Number(formData.seatCapacity),
      busType: formData.busType,
      busClass: formData.busClass,
      ...(editingBus?.id ? { status: formData.status } : {}),
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editingBus?.id) {
        await updateDashboardBus(editingBus.id, payload);
        showToast('success', 'Bus updated successfully.');
      } else {
        await createDashboardBus(payload);
        showToast('success', 'Bus created successfully.');
      }
      await execute();
      closeFormDrawer();
    } catch (err) {
      setFormError(err?.message || 'Failed to save bus.');
      showToast('error', err?.message || 'Failed to save bus.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (bus) => {
    setBusToDelete(bus);
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteOpen(false);
    setBusToDelete(null);
  };

  const handleDeleteBus = async () => {
    if (!busToDelete?.id) return;
    setDeleting(true);
    try {
      await deleteDashboardBus(busToDelete.id);
      showToast('success', 'Bus deleted successfully.');
      await execute();
      closeDeleteDialog();
    } catch (err) {
      showToast('error', err?.message || 'Failed to delete bus.');
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateSeats = async (bus) => {
    if (!bus?.id) return;
    setGeneratingBusId(bus.id);
    try {
      const columnsPerRow =
        bus.busType === 'SLEEPER' ? 2 : bus.busClass === 'BUSINESS' ? 3 : 4;
      await generateDashboardBusSeats(bus.id, columnsPerRow, true);
      showToast('success', `Seats regenerated for ${bus.name ?? bus.busName}.`);
    } catch (err) {
      showToast('error', err?.message || 'Failed to regenerate seats.');
    } finally {
      setGeneratingBusId('');
    }
  };

  const seatPreview = useMemo(() => {
    if (formData.busType === 'SLEEPER') {
      return {
        capacity: 36,
        columns: 2,
        rows: 18,
        layout: 'Sleeper (Upper 18, Lower 18)',
      };
    }

    const capacity = formData.busClass === 'BUSINESS' ? 28 : Number(formData.seatCapacity || 0);
    if (formData.busClass === 'BUSINESS') {
      const fullRows = capacity > 4 ? Math.floor((capacity - 4) / 3) : 0;
      const rows = Math.max(1, fullRows + 1);
      return { capacity, columns: 3, rows, layout: '1:2 (last row 2:2)' };
    }
    const columns = 4;
    const rows = Math.ceil(Math.max(capacity, 0) / columns);
    return { capacity, columns, rows, layout: '2:2' };
  }, [formData.busClass, formData.seatCapacity]);

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Bus Management</h1>
          <p className="text-sm text-slate-500">Manage routes, capacity, and bus status.</p>
        </div>
        <button
          type="button"
          onClick={openFormDrawer}
          className="rounded-md bg-[#0f172a] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1e293b]"
        >
          Add Bus
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-9 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message || 'Failed to load buses.'}
          </div>
        ) : buses.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No buses found. Add your first bus to get started.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Name</th>
                    {showOperatorColumn ? (
                      <th className="px-3 py-2 font-medium">Operator</th>
                    ) : null}
                    <th className="px-3 py-2 font-medium">Reg No</th>
                    <th className="px-3 py-2 font-medium">Seats</th>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBuses.map((bus) => (
                    <tr key={bus.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800">{bus.name ?? bus.busName}</td>
                      {showOperatorColumn ? (
                        <td className="px-3 py-2 text-slate-700">
                          {bus.operator?.companyName ?? bus.operatorName ?? '-'}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 text-slate-700">{bus.registrationNumber}</td>
                      <td className="px-3 py-2 text-slate-700">{bus.seatCapacity}</td>
                      <td className="px-3 py-2 text-slate-700">{bus.busClass ?? 'ECONOMY'}</td>
                      <td className="px-3 py-2">
                        <TypeBadge type={bus.busType} />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={bus.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(bus)}
                            title="Edit Bus"
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(bus)}
                            title="Delete Bus"
                            className="rounded-md border border-slate-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                          >
                            <IconDelete />
                          </button>
                          {/* <button
                            type="button"
                            onClick={() => handleGenerateSeats(bus)}
                            title="Generate Seats"
                            disabled={generatingBusId === bus.id}
                            className="rounded-md border border-slate-200 p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {generatingBusId === bus.id ? <IconSpinner /> : <IconSeat />}
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-1 text-xs text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
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
              {editingBus ? 'Edit Bus' : 'Add Bus'}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={handleSaveBus}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InputField
                  label="Bus Name"
                  value={formData.busName}
                  onChange={(value) => handleFormChange('busName', value)}
                />
                {requireOperatorOnCreate && !editingBus ? (
                  <OperatorSelect
                    value={formData.operatorId}
                    onChange={(value) => handleFormChange('operatorId', value)}
                  />
                ) : null}
                <InputField
                  label="Registration Number"
                  value={formData.registrationNumber}
                  onChange={(value) => handleFormChange('registrationNumber', value)}
                />
                <InputField
                  label="Seat Capacity"
                  type="number"
                  value={
                    formData.busType === 'SLEEPER'
                      ? 36
                      : formData.busClass === 'BUSINESS'
                        ? 28
                        : formData.seatCapacity
                  }
                  onChange={(value) => handleFormChange('seatCapacity', value)}
                  disabled={formData.busClass === 'BUSINESS' || formData.busType === 'SLEEPER'}
                />
                <SelectField
                  label="Bus Type"
                  value={formData.busType}
                  options={BUS_TYPES}
                  onChange={(value) => handleFormChange('busType', value)}
                />
                <SelectField
                  label="Bus Class"
                  value={formData.busClass}
                  options={BUS_CLASSES}
                  onChange={(value) => handleFormChange('busClass', value)}
                />
                <div className="sm:col-span-2">
                  <SelectField
                    label="Status"
                    value={formData.status}
                    options={BUS_STATUSES}
                    onChange={(value) => handleFormChange('status', value)}
                  />
                </div>
              </div>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Layout preview: {seatPreview.layout} format, {seatPreview.rows} row(s),{' '}
                {seatPreview.columns} column(s) per row, {seatPreview.capacity} seat(s).
              </p>

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
            <h2 className="text-base font-semibold text-slate-900">Delete Bus</h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this bus?
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
                onClick={handleDeleteBus}
                disabled={deleting}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`rounded-md px-3 py-2 text-sm font-medium shadow-sm ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TypeBadge({ type }) {
  const colorMap = {
    AC: 'bg-sky-100 text-sky-700',
    NON_AC: 'bg-indigo-100 text-indigo-700',
    SLEEPER: 'bg-violet-100 text-violet-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorMap[type] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }) {
  const colorMap = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-slate-200 text-slate-700',
    MAINTENANCE: 'bg-amber-100 text-amber-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorMap[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  );
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

function IconSeat() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M4.5 3.75A1.75 1.75 0 0 1 6.25 2h7.5A1.75 1.75 0 0 1 15.5 3.75v5A1.75 1.75 0 0 1 13.75 10.5h-7.5A1.75 1.75 0 0 1 4.5 8.75v-5Z" />
      <path d="M3 11.75a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V14H4.5v1.25a.75.75 0 0 1-1.5 0v-3.5Z" />
      <path d="M6.5 14.75a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0V15.5a.75.75 0 0 1 .75-.75Zm7 0a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0V15.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-emerald-600">
      <circle cx="12" cy="12" r="10" className="stroke-current opacity-25" strokeWidth="4" fill="none" />
      <path
        className="fill-current opacity-90"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

export default BusesPage;
