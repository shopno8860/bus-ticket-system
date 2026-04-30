import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FaBars,
  FaBus,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaRegMoneyBillAlt,
  FaSignOutAlt,
  FaTimes,
  FaUserCircle,
  FaUsers,
} from 'react-icons/fa';
import { MdOutlineAltRoute } from 'react-icons/md';
import { useAuth } from '../features/auth/context/AuthContext';

function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: FaChartPie },
    { to: '/admin/buses', label: 'Bus Management', icon: FaBus },
    { to: '/admin/trips', label: 'Trip Management', icon: MdOutlineAltRoute },
    {
      to: '/admin/refunds',
      label: 'Refund Requests',
      icon: FaRegMoneyBillAlt,
    },
    { to: '/admin/users', label: 'User Management', icon: FaUsers },
  ];

  const pageTitle = useMemo(() => {
    const active = links.find((link) => location.pathname.startsWith(link.to));
    return active?.label ?? 'Dashboard';
  }, [links, location.pathname]);

  const sidebarWidth = collapsed ? 'w-[88px]' : 'w-[280px]';
  const desktopPadding = collapsed ? 'lg:pl-[112px]' : 'lg:pl-[304px]';

  return (
    <div className="min-h-screen bg-slate-100">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen ${sidebarWidth} transform transition-all duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{
          background:
            'linear-gradient(180deg, #0f2027 0%, #203a43 55%, #2c5364 100%)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            {!collapsed && (
              <h1 className="text-white text-lg font-extrabold tracking-wide">
                Admin Panel
              </h1>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label="Toggle collapse"
              >
                {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
              <button
                type="button"
                className="lg:hidden h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all flex"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-md'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="text-base shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-white/10">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 hover:text-white transition-all duration-200"
            >
              <FaSignOutAlt className="text-base shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className={`${desktopPadding} transition-all duration-300`}>
        <header
          className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-4"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden h-10 w-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <FaBars className="mx-auto" />
              </button>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                {pageTitle}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <FaUserCircle className="text-3xl text-slate-500" />
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
