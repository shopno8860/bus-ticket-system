import { useEffect, useState } from 'react';
import { getAdminPayments } from '../services/adminApi';

function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminPayments();
        setPayments(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div>Loading payments...</div>;

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div key={payment.id} className="rounded border bg-white p-3">
          <div className="font-medium">{payment.transactionId || payment.id}</div>
          <div className="text-sm text-gray-500">
            {payment.status} • ৳{payment.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PaymentsPage;
