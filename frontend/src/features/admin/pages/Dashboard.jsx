import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiTruck,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { getAdminStats } from '../services/adminApi';

function Dashboard() {
  const navigate = useNavigate();
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

  const statCards = useMemo(
    () => [
      {
        key: 'users',
        title: 'Total Users',
        value: Number(stats?.totalUsers ?? 0),
        subtitle: '+5% from last week',
        icon: FiUser,
        gradient: 'from-blue-500/15 to-sky-400/10',
      },
      {
        key: 'buses',
        title: 'Total Buses',
        value: Number(stats?.totalBuses ?? 0),
        subtitle: '+2 added this week',
        icon: FiTruck,
        gradient: 'from-indigo-500/15 to-violet-400/10',
      },
      {
        key: 'trips',
        title: 'Total Trips',
        value: Number(stats?.totalTrips ?? 0),
        subtitle: '+8 scheduled today',
        icon: FiCalendar,
        gradient: 'from-emerald-500/15 to-teal-400/10',
      },
      {
        key: 'bookings',
        title: 'Total Bookings',
        value: Number(stats?.totalBookings ?? 0),
        subtitle: '+12% from last week',
        icon: FiClock,
        gradient: 'from-cyan-500/15 to-blue-400/10',
      },
      {
        key: 'revenue',
        title: 'Total Revenue',
        value: Number(stats?.totalRevenue ?? 0),
        subtitle: '+7% from last week',
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
          Overview of system performance
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {statCards.map(({ key, ...cardProps }) => (
          <StatCard key={key} {...cardProps} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Booking Trends</h2>
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats?.bookingTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Revenue Overview</h2>
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats?.revenueOverview ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`৳${value}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Recent Activity</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentActivity ?? []).map((item, idx) => (
                  <tr
                    key={`${item.user}-${item.action}-${idx}`}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="py-3 text-slate-700">{item.user}</td>
                    <td className="py-3 text-slate-700">{item.action}</td>
                    <td className="py-3 text-slate-500">
                      {new Date(item.date).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              onClick={() => navigate('/admin/bus')}
            >
              Add Bus
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              onClick={() => navigate('/admin/trip')}
            >
              Create Trip
            </button>
            <button
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
              onClick={() => navigate('/admin/booking')}
            >
              View Bookings
            </button>
            <button
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
              onClick={() => navigate('/admin/refund')}
            >
              View Refunds
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

function StatusBadge({ status }) {
  const colorMap = {
    Success: 'bg-emerald-100 text-emerald-700',
    Warning: 'bg-amber-100 text-amber-700',
    Pending: 'bg-sky-100 text-sky-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colorMap[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  );
}

export default Dashboard;
