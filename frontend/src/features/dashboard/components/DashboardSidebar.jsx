import { NavLink } from 'react-router-dom';
import { FaBars, FaChevronLeft, FaChevronRight, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { getDashboardMenuItems } from '../config/dashboardNav';
import { usePermissions } from '../hooks/usePermissions';

function DashboardSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onLogout,
}) {
  const { canAny, isAdmin, operatorId } = usePermissions();

  const visibleItems = getDashboardMenuItems({ isAdmin, operatorId }).filter((item) =>
    canAny(...item.permissions),
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={onCloseMobile}
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
              <h1 className="text-lg font-extrabold tracking-wide text-white">
                EasyTrip Dashboard
              </h1>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-white/10 hover:text-white lg:flex"
                onClick={onToggleCollapse}
                aria-label="Toggle sidebar"
              >
                {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-white/10 hover:text-white lg:hidden"
                onClick={onCloseMobile}
                aria-label="Close sidebar"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-4">
            {visibleItems.map(({ to, label, icon: Icon, end = false }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onCloseMobile}
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
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-100 transition-all duration-200 hover:bg-red-500/20 hover:text-white"
            >
              <FaSignOutAlt className="shrink-0 text-base" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function SidebarMobileToggle({ onOpen }) {
  return (
    <button
      type="button"
      className="h-10 w-10 rounded-xl border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 lg:hidden"
      onClick={onOpen}
      aria-label="Open sidebar"
    >
      <FaBars className="mx-auto" />
    </button>
  );
}

export default DashboardSidebar;
