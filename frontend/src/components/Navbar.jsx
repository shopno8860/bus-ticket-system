import { Link } from "react-router-dom";

const Navbar = () => {
  // Mock login state for demonstration
  const isLoggedIn = false;

  return (
    <div className="navbar bg-white shadow-sm sticky top-0 z-50 px-4 md:px-8 h-[60px]">
      <div className="navbar-start flex-1">
        <Link
          to="/"
          className="btn btn-ghost text-2xl font-bold px-2 hover:bg-transparent"
        >
          <span className="text-base-content text-3xl">Easy</span>
          <span className="text-green-500 text-3xl">Trip</span>
        </Link>
      </div>

      <div className="navbar-end flex-none gap-2">
        {isLoggedIn ? (
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar"
            >
              <div className="w-10 rounded-full border border-base-300">
                <img
                  alt="User profile"
                  src="https://ui-avatars.com/api/?name=Mock+User&background=random"
                />
              </div>
            </div>
            <ul
              tabIndex={0}
              className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
            >
              <li>
                <Link to="/profile">Profile</Link>
              </li>
              <li>
                <button>Logout</button>
              </li>
            </ul>
          </div>
        ) : (
          <Link
            to="/auth/login"
            className="btn btn-success text-white rounded-full px-6 transition-transform duration-300 hover:scale-105 text-white"
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;
