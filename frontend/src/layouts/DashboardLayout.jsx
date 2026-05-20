import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar';
import DashboardTopbar from '../features/dashboard/components/DashboardTopbar';
import { getDashboardPageTitle } from '../features/dashboard/config/dashboardNav';

function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = useMemo(
    () => getDashboardPageTitle(location.pathname),
    [location.pathname],
  );

  const desktopPadding = collapsed ? 'lg:pl-[112px]' : 'lg:pl-[304px]';

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={logout}
      />

      <div className={`${desktopPadding} transition-all duration-300`}>
        <DashboardTopbar
          pageTitle={pageTitle}
          user={user}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={logout}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
