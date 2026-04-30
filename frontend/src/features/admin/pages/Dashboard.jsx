import { useEffect, useState } from 'react';
import { getAdminStats } from '../services/adminApi';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
      <StatCard label="Total Bookings" value={stats?.totalBookings ?? 0} />
      <StatCard label="Total Revenue" value={`৳${stats?.totalRevenue ?? 0}`} />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="text-sm text-base-content/60">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default Dashboard;
