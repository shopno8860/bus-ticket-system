import { useEffect, useState } from 'react';
import { FiBriefcase, FiCalendar } from 'react-icons/fi';
import { getStaffStats } from '../services/staffApi';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getStaffStats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load staff stats');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Staff Dashboard</h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Welcome, {stats?.operatorName ? `you are part of ${stats.operatorName}` : 'manage bookings'}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-400/10 border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Operator</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {stats?.operatorName || 'N/A'}
              </p>
            </div>
            <div className="rounded-xl bg-white/70 p-2 text-slate-700">
              <FiBriefcase size={18} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-400/10 border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Bookings</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {Number(stats?.totalBookings ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/70 p-2 text-slate-700">
              <FiCalendar size={18} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
