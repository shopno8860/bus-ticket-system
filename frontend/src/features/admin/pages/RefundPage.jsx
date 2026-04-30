import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../../../config';
import { useFetch } from '../../../hooks/useFetch';
import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

const REFUND_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function RefundPage() {
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    search: '',
  });

  const [selectedRefund, setSelectedRefund] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const refundQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.date) params.set('date', filters.date);
    return params.toString();
  }, [filters.status, filters.date]);

  const fetchRefunds = useCallback(async () => {
    const path = refundQuery ? `${endpoints.admin.refunds}?${refundQuery}` : endpoints.admin.refunds;
    return apiFetch(path).then((res) => res.items ?? res);
  }, [refundQuery]);

  const {
    data: refundData,
    error: refundError,
    loading: refundLoading,
    execute: refetch,
  } = useFetch(fetchRefunds);

  const refunds = Array.isArray(refundData) ? refundData : [];
  const filteredRefunds = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    if (!query) return refunds;

    return refunds.filter((refund) => {
      const bookingRef = String(refund.booking?.bookingReference ?? '').toLowerCase();
      const phone = String(
        refund.user?.phoneNumber ?? refund.user?.phone ?? refund.booking?.user?.phoneNumber ?? refund.booking?.user?.phone ?? '',
      ).toLowerCase();
      return bookingRef.includes(query) || phone.includes(query);
    });
  }, [refunds, filters.search]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const resetActionModal = () => {
    setApproveTarget(null);
    setRejectTarget(null);
    setAdminNote('');
    setActionError('');
  };

  const runRefundAction = async (type) => {
    const target = type === 'approve' ? approveTarget : rejectTarget;
    if (!target?.id) return;
    if (type === 'reject' && !adminNote.trim()) {
      setActionError('Admin note is required for rejection.');
      return;
    }

    setSubmitting(true);
    setActionError('');

    try {
      const token = localStorage.getItem('accessToken');
      const endpoint =
        type === 'approve' ? endpoints.admin.approveRefund(target.id) : endpoints.admin.rejectRefund(target.id);
      const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ adminNote: adminNote.trim() || undefined }),
      });

      if (!response.ok) {
        let message = type === 'approve' ? 'Failed to approve refund.' : 'Failed to reject refund.';
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
      resetActionModal();
      showToast('success', type === 'approve' ? 'Refund approved successfully.' : 'Refund rejected successfully.');
    } catch (err) {
      const fallback = type === 'approve' ? 'Failed to approve refund.' : 'Failed to reject refund.';
      const message = err?.message || fallback;
      setActionError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Refund Management</h1>
          <p className="text-sm text-slate-500">Handle and process refund requests</p>
        </div>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Search by booking ref or phone"
          className="w-full max-w-xs rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <FilterField label="Status">
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All status</option>
              {REFUND_STATUSES.map((status) => (
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
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {refundLoading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <IconSpinner />
          </div>
        ) : refundError ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {refundError.message || 'Failed to load refunds.'}
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No refund requests</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Booking Ref</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Trip Info</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="border-b border-slate-100 align-top transition hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{refund.booking?.bookingReference ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">
                        {refund.user?.fullName ?? refund.user?.name ?? refund.booking?.user?.fullName ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {refund.user?.phoneNumber ??
                          refund.user?.phone ??
                          refund.booking?.user?.phoneNumber ??
                          refund.booking?.user?.phone ??
                          '-'}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{refund.booking?.trip?.bus?.name ?? '-'}</p>
                      <p className="text-xs text-slate-500">{refund.booking?.trip?.operator?.name ?? '-'}</p>
                      <p className="text-xs text-slate-600">
                        {refund.booking?.trip?.route?.origin ?? '-'} {'->'}{' '}
                        {refund.booking?.trip?.route?.destination ?? '-'}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatAmount(refund.amount ?? refund.refundAmount ?? refund.booking?.totalAmount)}
                    </td>
                    <td className="px-3 py-2">
                      <p className="max-w-[220px] truncate text-slate-700">{refund.reason ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={refund.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {refund.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              title="Approve Refund"
                              onClick={() => {
                                setApproveTarget(refund);
                                setAdminNote('');
                                setActionError('');
                              }}
                              disabled={submitting}
                              className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              title="Reject Refund"
                              onClick={() => {
                                setRejectTarget(refund);
                                setAdminNote('');
                                setActionError('');
                              }}
                              disabled={submitting}
                              className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          title="View Details"
                          onClick={() => setSelectedRefund(refund)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                        >
                          <IconView />
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

      {selectedRefund ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <button
            type="button"
            aria-label="Close refund details panel"
            className="h-full flex-1 cursor-default"
            onClick={() => setSelectedRefund(null)}
          />
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Refund Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Booking Info" value={selectedRefund.booking?.bookingReference ?? '-'} />
              <DetailRow
                label="User Info"
                value={`${selectedRefund.user?.fullName ?? selectedRefund.user?.name ?? selectedRefund.booking?.user?.fullName ?? '-'} (${selectedRefund.user?.phoneNumber ?? selectedRefund.user?.phone ?? selectedRefund.booking?.user?.phoneNumber ?? '-'})`}
              />
              <DetailRow
                label="Payment Info"
                value={`${selectedRefund.payment?.transactionId ?? selectedRefund.payment?.id ?? '-'} | ${selectedRefund.payment?.status ?? 'UNKNOWN'}`}
              />
              <DetailRow
                label="Refund Amount"
                value={formatAmount(
                  selectedRefund.amount ?? selectedRefund.refundAmount ?? selectedRefund.booking?.totalAmount,
                )}
              />
              <DetailRow label="Reason" value={selectedRefund.reason ?? '-'} />
              <DetailRow label="Status" value={selectedRefund.status ?? 'UNKNOWN'} />
              <DetailRow label="Admin Note" value={selectedRefund.adminNote ?? '-'} />
              <DetailRow
                label="Processed By"
                value={selectedRefund.processedBy?.fullName ?? selectedRefund.processedBy?.name ?? '-'}
              />
              <DetailRow label="Processed Time" value={formatDateTime(selectedRefund.processedAt)} />
            </div>
          </div>
        </div>
      ) : null}

      {approveTarget ? (
        <ActionModal
          title="Approve Refund"
          confirmLabel={submitting ? 'Approving...' : 'Confirm Approve'}
          onClose={resetActionModal}
          onConfirm={() => runRefundAction('approve')}
          disabled={submitting}
          error={actionError}
          note={adminNote}
          setNote={setAdminNote}
          noteRequired={false}
          bookingRef={approveTarget.booking?.bookingReference}
        />
      ) : null}

      {rejectTarget ? (
        <ActionModal
          title="Reject Refund"
          confirmLabel={submitting ? 'Rejecting...' : 'Confirm Reject'}
          onClose={resetActionModal}
          onConfirm={() => runRefundAction('reject')}
          disabled={submitting}
          error={actionError}
          note={adminNote}
          setNote={setAdminNote}
          noteRequired
          bookingRef={rejectTarget.booking?.bookingReference}
        />
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

function StatusBadge({ status }) {
  const colorMap = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorMap[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status ?? 'UNKNOWN'}
    </span>
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

function ActionModal({
  title,
  confirmLabel,
  onClose,
  onConfirm,
  disabled,
  error,
  note,
  setNote,
  noteRequired,
  bookingRef,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Booking: <span className="font-medium">{bookingRef ?? '-'}</span>
        </p>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Admin Note {noteRequired ? '(Required)' : '(Optional)'}
          </span>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={noteRequired ? 'Add rejection note' : 'Add note for this action'}
          />
        </label>
        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatAmount(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '৳ 0';
  return `৳ ${amount.toLocaleString('en-BD')}`;
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

function IconView() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 4.5c4.2 0 7.32 2.766 8.5 5.5-1.18 2.734-4.3 5.5-8.5 5.5S2.68 12.734 1.5 10c1.18-2.734 4.3-5.5 8.5-5.5Zm0 2c-2.745 0-4.973 1.58-6.18 3.5 1.207 1.92 3.435 3.5 6.18 3.5s4.973-1.58 6.18-3.5c-1.207-1.92-3.435-3.5-6.18-3.5Zm0 1.75a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z" />
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

export default RefundPage;
