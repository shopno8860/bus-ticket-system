import { useEffect, useMemo, useState } from 'react';
import {
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiTruck,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getOperatorStats } from '../services/operatorApi';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getOperatorStats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load operator stats');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const statCards = useMemo(
    () => [
      {
        key: 'buses',
        title: 'Total Buses',
        value: Number(stats?.totalBuses ?? 0),
        subtitle: 'Fleet size',
        icon: FiTruck,
        gradient: 'from-indigo-500/15 to-violet-400/10',
      },
      {
        key: 'trips',
        title: 'Total Trips',
        value: Number(stats?.totalTrips ?? 0),
        subtitle: 'Scheduled trips',
        icon: FiCalendar,
        gradient: 'from-emerald-500/15 to-teal-400/10',
      },
      {
        key: 'bookings',
        title: 'Total Bookings',
        value: Number(stats?.totalBookings ?? 0),
        subtitle: 'All time bookings',
        icon: FiClock,
        gradient: 'from-cyan-500/15 to-blue-400/10',
      },
      {
        key: 'staff',
        title: 'Total Staff',
        value: Number(stats?.totalStaff ?? 0),
        subtitle: 'Team members',
        icon: FiUsers,
        gradient: 'from-blue-500/15 to-sky-400/10',
      },
      {
        key: 'revenue',
        title: 'Total Revenue',
        value: Number(stats?.totalRevenue ?? 0),
        subtitle: 'Revenue to date',
        icon: FiTrendingUp,
        gradient: 'from-amber-500/15 to-orange-400/10',
        prefix: '৳',
      },
      {
        key: 'refunds',
        title: 'Pending Refunds',
        value: Number(stats?.pendingRefunds ?? 0),
        subtitle: 'Needs attention',
        icon: FiRefreshCw,
        gradient: 'from-rose-500/15 to-pink-400/10',
      },
    ],
    [stats],
  );

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Overview of your operator performance
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {statCards.map(({ key, ...cardProps }) => (
          <StatCard key={key} {...cardProps} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1e293b]"
              onClick={() => navigate('/operator/bus')}
            >
              Add Bus
            </button>
            <button
              className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1e293b]"
              onClick={() => navigate('/operator/trip')}
            >
              Create Trip
            </button>
            <button
              className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1e293b]"
              onClick={() => navigate('/operator/booking')}
            >
              View Bookings
            </button>
            <button
              className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1e293b]"
              onClick={() => navigate('/operator/staff')}
            >
              Manage Staff
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function useCountUp(target, duration = 900) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = Number(target ?? 0);
    if (end <= 0) {
      setCount(0);
      return undefined;
    }

    let frame;
    const start = performance.now();

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}

function StatCard({ title, value, subtitle, icon: Icon, gradient, prefix = '' }) {
  const animatedValue = useCountUp(value);

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${gradient} border border-slate-200 p-5 shadow-sm transition duration-300 hover:scale-[1.02] hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {prefix}
            {animatedValue.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2 text-slate-700">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
