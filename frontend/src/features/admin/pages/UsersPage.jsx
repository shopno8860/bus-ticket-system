import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../../../config';
import { useFetch } from '../../../hooks/useFetch';
import { apiFetch } from '../../../services/api';

function UsersPage() {
  const [filters, setFilters] = useState({
    role: '',
    date: '',
    search: '',
  });
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('USER');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const userQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.role) params.set('role', filters.role);
    if (filters.date) params.set('date', filters.date);
    return params.toString();
  }, [filters.role, filters.date]);

  const fetchUsers = useCallback(async () => {
    const path = userQuery ? `/users?${userQuery}` : '/users';
    return apiFetch(path).then((res) => res.items ?? res);
  }, [userQuery]);

  const {
    data: userData,
    error: userError,
    loading: userLoading,
    execute: refetch,
  } = useFetch(fetchUsers);

  const users = Array.isArray(userData) ? userData : [];
  const filteredUsers = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const name = String(user.fullName ?? '').toLowerCase();
      const email = String(user.email ?? '').toLowerCase();
      const phone = String(user.phoneNumber ?? '').toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [filters.search, users]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const openRoleModal = (user) => {
    setRoleModalUser(user);
    setSelectedRole(user.role === 'ADMIN' ? 'ADMIN' : 'USER');
  };

  const closeRoleModal = () => {
    setRoleModalUser(null);
    setSelectedRole('USER');
    setUpdatingRole(false);
  };

  const handleRoleUpdate = async () => {
    if (!roleModalUser?.id || selectedRole === roleModalUser.role) return;
    setUpdatingRole(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${config.apiBaseUrl}/users/${roleModalUser.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: selectedRole }),
      }).then(async (response) => {
        if (response.ok) return response;
        let message = 'Failed to update user role.';
        try {
          const errorData = await response.json();
          message = errorData?.message || message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      });
      await refetch();
      closeRoleModal();
      showToast('success', 'User role updated successfully.');
    } catch (err) {
      showToast('error', err?.message || 'Failed to update user role.');
      setUpdatingRole(false);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Manage all users</p>
        </div>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Search by name, email or phone"
          className="w-full max-w-xs rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <FilterField label="Role">
            <select
              value={filters.role}
              onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All roles</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
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
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {userLoading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <IconSpinner />
          </div>
        ) : userError ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {userError.message || 'Failed to load users.'}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Joined Date</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{user.fullName || 'Unknown'}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{user.email || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{user.phoneNumber || '-'}</td>
                    <td className="px-3 py-2">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatDate(user.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openRoleModal(user)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Change Role
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          View Details
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

      {roleModalUser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Change User Role</h2>
            <p className="mt-1 text-sm text-slate-600">
              User: <span className="font-medium">{roleModalUser.fullName || '-'}</span>
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Role</span>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRoleModal}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRoleUpdate}
                disabled={updatingRole || selectedRole === roleModalUser.role}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingRole ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedUser ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <button
            type="button"
            aria-label="Close user details panel"
            className="h-full flex-1 cursor-default"
            onClick={() => setSelectedUser(null)}
          />
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">User Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Name" value={selectedUser.fullName} />
              <DetailRow label="Email" value={selectedUser.email} />
              <DetailRow label="Phone" value={selectedUser.phoneNumber} />
              <DetailRow label="Role" value={selectedUser.role} />
              <DetailRow label="Joined Date" value={formatDate(selectedUser.createdAt)} />
              <DetailRow label="Total Bookings" value={selectedUser.totalBookings} />
              <DetailRow label="Total Payments" value={selectedUser.totalPayments} />
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm ${
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

function RoleBadge({ role }) {
  const badgeClass = role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badgeClass}`}>{role || 'USER'}</span>;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin text-slate-500">
      <circle cx="12" cy="12" r="10" className="stroke-current opacity-25" strokeWidth="4" fill="none" />
      <path className="fill-current opacity-90" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

export default UsersPage;
