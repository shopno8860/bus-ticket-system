import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDashboardOperatorStats,
  getDashboardStats,
} from '../services/dashboardApi';
import { usePermissions } from '../hooks/usePermissions';

function OperatorOverviewPage() {
  const { operatorId } = useParams();
  const { isAdmin } = usePermissions();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!operatorId) {
      return;
    }

    setLoading(true);
    const loadStats = isAdmin
      ? getDashboardOperatorStats(operatorId)
      : getDashboardStats();

    loadStats
      .then(setStats)
      .catch((err) => setError(err.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, [operatorId, isAdmin]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading overview...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const cards = [
    { key: 'buses', label: 'Buses', value: stats?.totalBuses ?? 0 },
    { key: 'trips', label: 'Trips', value: stats?.totalTrips ?? 0 },
    { key: 'bookings', label: 'Bookings', value: stats?.totalBookings ?? 0 },
    {
      key: 'revenue',
      label: 'Revenue',
      value: Number(stats?.totalRevenue ?? 0).toLocaleString(),
    },
    { key: 'staff', label: 'Staff', value: stats?.totalStaff ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OperatorOverviewPage;
