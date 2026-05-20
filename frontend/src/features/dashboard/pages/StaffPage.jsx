import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import {
  createDashboardStaff,
  deleteDashboardStaff,
  getDashboardStaff,
  updateDashboardStaff,
} from '../services/dashboardApi';
import { useDashboardScope } from '../hooks/useDashboardScope';

const defaultForm = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
};

function StaffPage() {
  const { operatorId } = useDashboardScope();
  const loadStaff = useCallback(
    () => getDashboardStaff(operatorId),
    [operatorId],
  );
  const { data, error, loading, execute } = useFetch(loadStaff);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const staff = Array.isArray(data) ? data : [];

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
    setEditingStaff(null);
    setFormError('');
  };

  const openFormModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      fullName: staffMember.fullName ?? staffMember.name ?? '',
      email: staffMember.email ?? '',
      password: '',
      phoneNumber: staffMember.phoneNumber ?? staffMember.phone ?? '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const validateForm = () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      return 'Name and email are required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!editingStaff && !formData.password.trim()) {
      return 'Password is required for new staff.';
    }
    if (formData.password && formData.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return '';
  };

  const handleSaveStaff = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber.trim(),
    };

    if (!editingStaff || formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingStaff?.id) {
        await updateDashboardStaff(editingStaff.id, payload, operatorId);
        showToast('success', 'Staff updated successfully.');
      } else {
        await createDashboardStaff(payload, operatorId);
        showToast('success', 'Staff created successfully.');
      }
      await execute();
      closeFormModal();
    } catch (err) {
      const message = err?.message || 'Failed to save staff.';
      setFormError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (staffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteOpen(false);
    setStaffToDelete(null);
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete?.id) return;
    setDeleting(true);
    try {
      await deleteDashboardStaff(staffToDelete.id, operatorId);
      showToast('success', 'Staff deleted successfully.');
      await execute();
      closeDeleteDialog();
    } catch (err) {
      showToast('error', err?.message || 'Failed to delete staff.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500">Manage your team members.</p>
        </div>
        <button
          type="button"
          onClick={openFormModal}
          className="rounded-md bg-[#0f172a] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1e293b]"
        >
          Add Staff
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
            {error.message || 'Failed to load staff.'}
          </div>
        ) : staff.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">
              No staff found. Add your first staff member to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Created Date</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((staffMember) => (
                  <tr
                    key={staffMember.id}
                    className="border-b border-slate-100 text-sm hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 text-slate-800">
                      {staffMember.fullName ?? staffMember.name ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{staffMember.email ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {staffMember.phoneNumber ?? staffMember.phone ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {formatDate(staffMember.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(staffMember)}
                          title="Edit Staff"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(staffMember)}
                          title="Delete Staff"
                          className="rounded-md border border-slate-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                        >
                          Delete
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              {editingStaff ? 'Edit Staff' : 'Add Staff'}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={handleSaveStaff}>
              <InputField
                label="Full Name"
                value={formData.fullName}
                onChange={(value) => setFormData((prev) => ({ ...prev, fullName: value }))}
              />
              <InputField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
              />
              <InputField
                label={editingStaff ? 'Password (optional)' : 'Password'}
                type="password"
                value={formData.password}
                onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
              />
              <InputField
                label="Phone (optional)"
                value={formData.phoneNumber}
                onChange={(value) => setFormData((prev) => ({ ...prev, phoneNumber: value }))}
              />

              {formError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-[#0f172a] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
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
            <h2 className="text-base font-semibold text-slate-900">Delete Staff</h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this staff member?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeDeleteDialog} className="rounded-md border px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={deleting}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
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
            className={`rounded-md px-3 py-2 text-sm text-white ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

export default StaffPage;
