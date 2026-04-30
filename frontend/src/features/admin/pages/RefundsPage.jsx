import { useEffect, useState } from 'react';
import {
  approveAdminRefund,
  getAdminRefunds,
  rejectAdminRefund,
} from '../services/adminApi';

function RefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const data = await getAdminRefunds();
      setRefunds(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const approve = async (id) => {
    await approveAdminRefund(id, '');
    await loadRefunds();
  };

  const reject = async (id) => {
    await rejectAdminRefund(id, '');
    await loadRefunds();
  };

  if (loading) return <div>Loading refunds...</div>;

  return (
    <div className="space-y-3">
      {refunds.map((refund) => (
        <div key={refund.id} className="rounded border bg-white p-3">
          <div className="font-medium">Refund #{refund.id.slice(-8)}</div>
          <div className="text-sm text-gray-500">
            {refund.status} • ৳{refund.amount}
          </div>
          {refund.status === 'PENDING' && (
            <div className="mt-2 flex gap-2">
              <button className="btn btn-sm btn-success text-white" onClick={() => approve(refund.id)}>
                Approve
              </button>
              <button className="btn btn-sm btn-error text-white" onClick={() => reject(refund.id)}>
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default RefundsPage;
