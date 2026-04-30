import { NavLink, Outlet } from 'react-router-dom';

function AdminLayout() {
  const links = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/bookings', label: 'Bookings' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/refunds', label: 'Refunds' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <header className="navbar border-b border-base-300 bg-base-100 px-4">
        <span className="text-lg font-semibold">Admin</span>
        <nav className="flex flex-wrap gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `btn btn-ghost btn-sm ${isActive ? 'btn-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
