import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import {
  createAdminBus,
  deleteAdminBus,
  generateBusSeats,
  getAdminBuses,
  updateAdminBus,
} from '../services/adminApi';

const BUS_TYPES = ['AC', 'NON_AC', 'SLEEPER'];
const BUS_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
const PAGE_SIZE = 8;

const defaultForm = {
  busName: '',
  operatorName: '',
  registrationNumber: '',
  seatCapacity: 40,
  busType: 'AC',
  status: 'ACTIVE',
};

function BusesPage() {
  const { data, error, loading, execute } = useFetch(getAdminBuses);
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

  const openAddModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (bus) => {
    setEditingBus(bus);
    setFormData({
      busName: bus.name ?? bus.busName ?? '',
      operatorName: bus.operatorName ?? '',
      registrationNumber: bus.registrationNumber ?? '',
      seatCapacity: Number(bus.seatCapacity ?? 1),
      busType: bus.busType ?? 'AC',
      status: bus.status ?? 'ACTIVE',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (
      !formData.busName.trim() ||
      !formData.operatorName.trim() ||
      !formData.registrationNumber.trim()
    ) {
      return 'All text fields are required.';
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
      operatorName: formData.operatorName.trim(),
      registrationNumber: formData.registrationNumber.trim(),
      seatCapacity: Number(formData.seatCapacity),
      busType: formData.busType,
      ...(editingBus?.id ? { status: formData.status } : {}),
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editingBus?.id) {
        await updateAdminBus(editingBus.id, payload);
        showToast('success', 'Bus updated successfully.');
      } else {
        await createAdminBus(payload);
        showToast('success', 'Bus created successfully.');
      }
      await execute();
      closeFormModal();
    } catch (err) {
      setFormError(err?.message || 'Failed to save bus.');
      showToast('error', err?.message || 'Failed to save bus.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (bus) => {
    setBusToDelete(bus);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setBusToDelete(null);
  };

  const handleDeleteBus = async () => {
    if (!busToDelete?.id) return;
    setDeleting(true);
    try {
      await deleteAdminBus(busToDelete.id);
      showToast('success', 'Bus deleted successfully.');
      await execute();
      closeDeleteModal();
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
      await generateBusSeats(bus.id, 4);
      showToast('success', `Seats generated for ${bus.name ?? bus.busName}.`);
    } catch (err) {
      showToast('error', err?.message || 'Failed to generate seats.');
    } finally {
      setGeneratingBusId('');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Bus Management</h1>
          <p className="text-sm text-slate-600 sm:text-base">Manage all buses</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Add Bus
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message || 'Failed to load buses.'}
          </div>
        ) : buses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center">
            <p className="text-slate-600">No buses found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-3 font-medium">Bus Name</th>
                    <th className="px-3 py-3 font-medium">Operator</th>
                    <th className="px-3 py-3 font-medium">Registration Number</th>
                    <th className="px-3 py-3 font-medium">Seat Capacity</th>
                    <th className="px-3 py-3 font-medium">Bus Type</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBuses.map((bus) => (
                    <tr key={bus.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                      <td className="px-3 py-3 text-slate-800">{bus.name ?? bus.busName}</td>
                      <td className="px-3 py-3 text-slate-700">{bus.operatorName}</td>
                      <td className="px-3 py-3 text-slate-700">{bus.registrationNumber}</td>
                      <td className="px-3 py-3 text-slate-700">{bus.seatCapacity}</td>
                      <td className="px-3 py-3">
                        <TypeBadge type={bus.busType} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={bus.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(bus)}
                            className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(bus)}
                            className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-200"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateSeats(bus)}
                            disabled={generatingBusId === bus.id}
                            className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {generatingBusId === bus.id ? 'Generating...' : 'Generate Seats'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
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
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingBus ? 'Edit Bus' : 'Add Bus'}
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleSaveBus}>
              <InputField
                label="Bus Name"
                value={formData.busName}
                onChange={(value) => handleFormChange('busName', value)}
              />
              <InputField
                label="Operator Name"
                value={formData.operatorName}
                onChange={(value) => handleFormChange('operatorName', value)}
              />
              <InputField
                label="Registration Number"
                value={formData.registrationNumber}
                onChange={(value) => handleFormChange('registrationNumber', value)}
              />
              <InputField
                label="Seat Capacity"
                type="number"
                value={formData.seatCapacity}
                onChange={(value) => handleFormChange('seatCapacity', value)}
              />

              <SelectField
                label="Bus Type"
                value={formData.busType}
                options={BUS_TYPES}
                onChange={(value) => handleFormChange('busType', value)}
              />
              <SelectField
                label="Status"
                value={formData.status}
                options={BUS_STATUSES}
                onChange={(value) => handleFormChange('status', value)}
              />

              {formError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Delete Bus</h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this bus?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBus}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${
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

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colorMap[type] ?? 'bg-slate-100 text-slate-700'}`}
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
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colorMap[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  );
}

export default BusesPage;
