import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, token, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!token || authLoading || !user) {
      return;
    }

    if (user.role === 'ADMIN') {
      navigate('/admin/dashboard');
      return;
    }

    navigate('/');
  }, [token, user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError('');
    setLoading(true);

    try {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      await login(email, password);
    } catch (err) {
      if (err.message && err.message.startsWith('{')) {
        try {
          const parsed = JSON.parse(err.message);
          setError(Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message);
        } catch {
          setError('Invalid login credentials');
        }
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormEmpty = !email || !password;

  return (
    <div className="h-screen w-full overflow-hidden flex bg-white select-none">
      
      {/* LEFT: Split Image Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 rounded-r-[40px] overflow-hidden shadow-2xl">
        <img
          src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=1200"
          alt="Travel"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        <div className="absolute bottom-20 left-16">
          <h1 className="text-5xl font-black text-white leading-tight">
            Think Tickets,<br />
            Think <span className="text-[#16a34a]">EasyTrip</span>
          </h1>
        </div>
      </div>

      {/* RIGHT: Login Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 lg:p-20 overflow-hidden">
        
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="mb-10">
            <Link to="/" className="flex items-center justify-end gap-1">
              <span className="text-4xl font-black text-slate-800 tracking-tighter">Easy</span>
              <span className="text-4xl font-black text-[#16a34a] tracking-tighter">Trip</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Welcome</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Login with your EasyTrip account and enjoy seamless booking
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-red-700 text-sm mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 ml-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Password
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs font-bold text-[#16a34a] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold px-2 py-1 hover:text-[#16a34a]"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isFormEmpty}
              className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-black py-4 rounded-xl shadow-lg shadow-[#16a34a]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>

            <div className="text-center mt-8">
              <p className="text-slate-500 font-bold text-sm">
                Don't have an account?{' '}
                <Link to="/auth/register" className="text-[#16a34a] hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
