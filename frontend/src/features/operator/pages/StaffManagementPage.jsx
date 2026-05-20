import { useEffect, useRef, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import {
  createOperatorStaff,
  deleteOperatorStaff,
  getOperatorStaff,
  updateOperatorStaff,
} from '../services/operatorApi';

const defaultForm = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
};

function StaffManagementPage() {
  const { data, error, loading, execute } = useFetch(getOperatorStaff);
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
        await updateOperatorStaff(editingStaff.id, payload);
        showToast('success', 'Staff updated successfully.');
      } else {
        await createOperatorStaff(payload);
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
      await deleteOperatorStaff(staffToDelete.id);
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
            <p className="text-sm text-slate-500">No staff found. Add your first staff member to get started.</p>
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
                  <tr key={staffMember.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800">{staffMember.fullName ?? staffMember.name ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{staffMember.email ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{staffMember.phoneNumber ?? staffMember.phone ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(staffMember.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(staffMember)}
                          title="Edit Staff"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(staffMember)}
                          title="Delete Staff"
                          className="rounded-md border border-slate-200 p-1.5 text-rose-600 transition hover:bg-rose-50"
                        >
                          <IconDelete />
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
                placeholder="Staff full name"
              />
              <InputField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
                placeholder="staff@example.com"
              />
              <InputField
                label={editingStaff ? 'Password (leave blank to keep current)' : 'Password'}
                type="password"
                value={formData.password}
                onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
                placeholder={editingStaff ? 'Leave blank to keep current' : 'Min 8 characters'}
              />
              <InputField
                label="Phone (optional)"
                type="tel"
                value={formData.phoneNumber}
                onChange={(value) => setFormData((prev) => ({ ...prev, phoneNumber: value }))}
                placeholder="Phone number"
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
            <h2 className="text-base font-semibold text-slate-900">Delete Staff</h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this staff member?
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
                onClick={handleDeleteStaff}
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

function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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

export default StaffManagementPage;
