import { useMemo, useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { FaBars, FaChevronLeft, FaChevronRight, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { useAuth } from '../features/auth/context/AuthContext';
import { operatorMenuItems, getOperatorPageTitle } from '../features/operator/config/operatorNav';

function OperatorLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = useMemo(() => {
    return getOperatorPageTitle(location.pathname);
  }, [location.pathname]);

  const desktopPadding = collapsed ? 'lg:pl-[112px]' : 'lg:pl-[304px]';

  return (
    <div className="min-h-screen bg-slate-100">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen ${
          collapsed ? 'w-[88px]' : 'w-[280px]'
        } transform bg-[linear-gradient(180deg,_#0f2027,_#203a43,_#2c5364)] shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            {!collapsed && (
              <h1 className="text-lg font-extrabold tracking-wide text-white">Operator Panel</h1>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-white/10 hover:text-white lg:flex"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label="Toggle sidebar"
              >
                {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-white/10 hover:text-white lg:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-4">
            {operatorMenuItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="shrink-0 text-base" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/10 px-3 py-4">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-100 transition-all duration-200 hover:bg-red-500/20 hover:text-white"
            >
              <FaSignOutAlt className="shrink-0 text-base" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className={`${desktopPadding} transition-all duration-300`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-10 w-10 rounded-xl border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open sidebar"
              >
                <FaBars className="mx-auto" />
              </button>
              <h2 className="text-xl font-extrabold text-slate-800 sm:text-2xl">{pageTitle}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold leading-tight text-slate-800">
                  {user?.fullName || 'Operator User'}
                </p>
                <p className="text-xs text-slate-500">Operator</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default OperatorLayout;
