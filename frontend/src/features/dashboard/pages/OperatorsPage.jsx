import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

function OperatorsPage() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    slug: '',
    email: '',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
  });

  const loadOperators = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(endpoints.dashboard.operators).then((res) => res.items ?? res);
      setOperators(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load operators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch(endpoints.dashboard.createOperator, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Operator created successfully');
      setShowCreateModal(false);
      setForm({ companyName: '', slug: '', email: '', adminEmail: '', adminName: '', adminPassword: '' });
      await loadOperators();
    } catch (err) {
      toast.error(err.message || 'Failed to create operator');
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = async (id) => {
    try {
      await apiFetch(endpoints.dashboard.suspendOperator(id), { method: 'POST' });
      toast.success('Operator suspended');
      await loadOperators();
    } catch (err) {
      toast.error(err.message || 'Failed to suspend operator');
    }
  };

  const handleActivate = async (id) => {
    try {
      await apiFetch(endpoints.dashboard.activateOperator(id), { method: 'POST' });
      toast.success('Operator activated');
      await loadOperators();
    } catch (err) {
      toast.error(err.message || 'Failed to activate operator');
    }
  };

  const statusBadge = (status) => {
    const map = {
      ACTIVE: 'bg-emerald-100 text-emerald-700',
      SUSPENDED: 'bg-rose-100 text-rose-700',
      PENDING: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-700'}`}>
        {status || 'UNKNOWN'}
      </span>
    );
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Operator Management</h1>
          <p className="text-sm text-slate-500">Manage bus operators</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1e293b]"
        >
          + Create Operator
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <IconSpinner />
          </div>
        ) : error ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : operators.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No operators found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr key={op.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-800">{op.companyName || 'Unknown'}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{op.slug || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{op.email || '-'}</td>
                    <td className="px-3 py-2">{statusBadge(op.status)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDate(op.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('dashboard:lastOperatorId', op.id);
                            navigate(`/dashboard/operators/${op.id}`);
                          }}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Manage
                        </button>
                        {op.status === 'SUSPENDED' ? (
                          <button
                            type="button"
                            onClick={() => handleActivate(op.id)}
                            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSuspend(op.id)}
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Create Operator</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <FormField label="Company Name" required>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </FormField>
              <FormField label="Slug" required>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </FormField>
              <FormField label="Company Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </FormField>
              <FormField label="Admin Email" required>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </FormField>
              <FormField label="Admin Name" required>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm((prev) => ({ ...prev, adminName: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </FormField>
              <FormField label="Admin Password" required>
                <input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-[#0f172a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label} {required && '*'}
      </span>
      {children}
    </label>
  );
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

export default OperatorsPage;
