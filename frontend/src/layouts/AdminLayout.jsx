import { NavLink, Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <header className="navbar border-b border-base-300 bg-base-100 px-4">
        <span className="text-lg font-semibold">Admin</span>
        <nav className="flex gap-2">
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `btn btn-ghost btn-sm ${isActive ? 'btn-active' : ''}`
            }
          >
            Dashboard
          </NavLink>
        </nav>
      </header>
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
