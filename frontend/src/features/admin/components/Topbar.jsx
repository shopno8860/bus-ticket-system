import { useState } from 'react';
import { FaBell, FaCaretDown, FaUserCircle } from 'react-icons/fa';
import { SidebarMobileToggle } from './Sidebar';

function Topbar({ pageTitle, user, onOpenMobile, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarMobileToggle onOpen={onOpenMobile} />
          <h2 className="text-xl font-extrabold text-slate-800 sm:text-2xl">{pageTitle}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 sm:flex"
            aria-label="Notifications"
          >
            <FaBell />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 transition-all hover:bg-slate-50"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Toggle profile menu"
            >
              <FaUserCircle className="text-3xl text-slate-500" />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold leading-tight text-slate-800">
                  {user?.fullName || 'Admin User'}
                </p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
              <FaCaretDown className="text-slate-500" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
