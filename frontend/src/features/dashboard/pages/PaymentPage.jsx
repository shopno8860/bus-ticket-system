import { useCallback, useMemo, useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import { withOperatorQuery } from '../services/dashboardApi';
import { useDashboardScope } from '../hooks/useDashboardScope';
import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
const PAYMENT_METHODS = ['BKASH', 'NAGAD', 'CARD'];

function PaymentPage() {
  const { operatorId } = useDashboardScope();
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    date: '',
    search: '',
  });
  const [selectedPayment, setSelectedPayment] = useState(null);

  const paymentQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.date) params.set('date', filters.date);
    return params.toString();
  }, [filters.status, filters.date]);

  const fetchPayments = useCallback(async () => {
    const params = new URLSearchParams(paymentQuery);
    if (operatorId) {
      params.set('operatorId', operatorId);
    }
    const url = params.toString()
      ? `${endpoints.dashboard.payments}?${params}`
      : withOperatorQuery(endpoints.dashboard.payments, operatorId);
    return apiFetch(url).then((res) => res.items ?? res);
  }, [operatorId, paymentQuery]);

  const {
    data: paymentData,
    error: paymentError,
    loading: paymentLoading,
  } = useFetch(fetchPayments);

  const payments = Array.isArray(paymentData) ? paymentData : [];
  const filteredPayments = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return payments.filter((payment) => {
      const paymentMethod = String(payment.method ?? payment.paymentMethod ?? '').toUpperCase();
      if (filters.method && paymentMethod !== filters.method) {
        return false;
      }
      const transactionId = String(payment.transactionId ?? '').toLowerCase();
      const phone = String(payment.user?.phoneNumber ?? payment.user?.phone ?? '').toLowerCase();
      if (!query) return true;
      return transactionId.includes(query) || phone.includes(query);
    });
  }, [payments, filters.method, filters.search]);

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Payment Management</h1>
          <p className="text-sm text-slate-500">Track all transactions and payments</p>
        </div>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Search by transaction ID or phone"
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
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Method">
            <select
              value={filters.method}
              onChange={(event) => setFilters((prev) => ({ ...prev, method: event.target.value }))}
              className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
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
        {paymentLoading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <IconSpinner />
          </div>
        ) : paymentError ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {paymentError.message || 'Failed to load payments.'}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Transaction ID</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Booking Ref</th>
                  <th className="px-3 py-2 font-medium">Trip Info</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 align-top transition hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{payment.transactionId ?? 'N/A'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">
                        {payment.user?.fullName ?? payment.user?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{payment.user?.phoneNumber ?? payment.user?.phone ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{payment.booking?.bookingReference ?? '-'}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{payment.booking?.trip?.bus?.name ?? '-'}</p>
                      <p className="text-xs text-slate-500">{payment.booking?.trip?.operator?.name ?? '-'}</p>
                      <p className="text-xs text-slate-600">
                        {payment.booking?.trip?.route?.origin ?? '-'} {'->'}{' '}
                        {payment.booking?.trip?.route?.destination ?? '-'}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatAmount(payment.amount)}</td>
                    <td className="px-3 py-2">
                      <MethodBadge method={payment.method ?? payment.paymentMethod} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        title="View Details"
                        onClick={() => setSelectedPayment(payment)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-100"
                      >
                        <IconView />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedPayment ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <button
            type="button"
            aria-label="Close payment details panel"
            className="h-full flex-1 cursor-default"
            onClick={() => setSelectedPayment(null)}
          />
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Payment Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Transaction ID" value={selectedPayment.transactionId ?? 'N/A'} />
              <DetailRow
                label="User Info"
                value={`${selectedPayment.user?.fullName ?? selectedPayment.user?.name ?? '-'} (${selectedPayment.user?.phoneNumber ?? selectedPayment.user?.phone ?? '-'})`}
              />
              <DetailRow label="Booking Info" value={selectedPayment.booking?.bookingReference ?? '-'} />
              <DetailRow
                label="Trip Info"
                value={`${selectedPayment.booking?.trip?.bus?.name ?? '-'} | ${selectedPayment.booking?.trip?.operator?.name ?? '-'} | ${selectedPayment.booking?.trip?.route?.origin ?? '-'} -> ${selectedPayment.booking?.trip?.route?.destination ?? '-'}`}
              />
              <DetailRow label="Payment Method" value={selectedPayment.method ?? selectedPayment.paymentMethod} />
              <DetailRow label="Status" value={selectedPayment.status} />
              <DetailRow label="Amount" value={formatAmount(selectedPayment.amount)} />
              <DetailRow
                label="Refund Info"
                value={
                  selectedPayment.refund
                    ? `${selectedPayment.refund.status ?? 'UNKNOWN'}${selectedPayment.refund.reason ? ` | ${selectedPayment.refund.reason}` : ''}`
                    : 'No refund record'
                }
              />
            </div>
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

function MethodBadge({ method }) {
  const colorMap = {
    BKASH: 'bg-pink-100 text-pink-700',
    NAGAD: 'bg-orange-100 text-orange-700',
    CARD: 'bg-blue-100 text-blue-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorMap[method] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {method ?? 'UNKNOWN'}
    </span>
  );
}

function StatusBadge({ status }) {
  const colorMap = {
    PENDING: 'bg-amber-100 text-amber-700',
    SUCCESS: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-rose-100 text-rose-700',
    REFUNDED: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorMap[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status ?? 'UNKNOWN'}
    </span>
  );
}

function formatAmount(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '৳ 0';
  return `৳ ${amount.toLocaleString('en-BD')}`;
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

export default PaymentPage;
