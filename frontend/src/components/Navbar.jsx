import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";

const Navbar = () => {
  const { user, logout, token } = useAuth();
  const isLoggedIn = !!token;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 h-16 md:h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center h-full">
          
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center">
            <Link
              to="/"
              className="flex items-center gap-0.5 group transition-transform duration-300 active:scale-95"
            >
              <span className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Easy</span>
              <span className="text-2xl md:text-3xl font-black text-[#16a34a] tracking-tight">Trip</span>
            </Link>
          </div>

          {/* Navigation/Action Section */}
          <div className="flex items-center space-x-6">
            <div className="hidden lg:flex items-center space-x-8 mr-8">
              <Link to="/" className="text-sm font-bold text-slate-600 hover:text-[#16a34a] transition-colors">Home</Link>
              <Link to="/trips" className="text-sm font-bold text-slate-600 hover:text-[#16a34a] transition-colors">Bus Tickets</Link>
              <Link to="/#contact" className="text-sm font-bold text-slate-600 hover:text-[#16a34a] transition-colors">Contact</Link>
            </div>

            {isLoggedIn ? (
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost btn-circle avatar border-2 border-slate-100 hover:border-[#16a34a]/20 transition-all p-0"
                >
                  <div className="w-10 rounded-full">
                    <img
                      alt="User profile"
                      src={`https://ui-avatars.com/api/?name=${user?.fullName || user?.name || 'User'}&background=16a34a&color=fff`}
                    />
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  className="mt-3 z-[1] p-2 shadow-xl menu menu-sm dropdown-content bg-base-100 rounded-xl w-52 border border-slate-100"
                >
                  <li className="menu-title text-[10px] uppercase tracking-widest text-slate-400">Account</li>
                  <li className="px-4 py-2 text-xs text-slate-500 border-b border-slate-50 mb-1">
                    Logged in as <span className="font-bold text-slate-700 block truncate">{user?.fullName}</span>
                  </li>
                  <li>
                    <Link to="/profile" className="py-3 font-bold text-slate-700">Profile</Link>
                  </li>
                  <li>
                    <button 
                      onClick={logout}
                      className="py-3 font-bold text-red-500 w-full text-left"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/auth/login"
                  className="px-8 py-2 md:py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-full font-bold text-sm md:text-base shadow-lg shadow-[#16a34a]/20 transition-all hover:scale-105 active:scale-95 hidden sm:block"
                >
                  Login
                </Link>
                {/* Mobile Menu Icon */}
                <button className="lg:hidden text-slate-600 p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
