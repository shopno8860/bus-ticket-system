import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, token } = useAuth();
  const navigate = useNavigate();

  // Prevent logged-in user from accessing register page
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { fullName, email, phoneNumber, password, confirmPassword } = formData;

    try {
      if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      if (fullName.length < 2) {
        throw new Error('Full name must be at least 2 characters');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      await register({ fullName, email, phoneNumber, password });
    } catch (err) {
      if (err.message && err.message.startsWith('{')) {
        try {
          const parsed = JSON.parse(err.message);
          setError(Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message);
        } catch {
          setError('Registration failed');
        }
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormEmpty = Object.values(formData).some(value => !value);

  return (
    <div className="h-screen w-full overflow-hidden flex bg-white select-none">
      
      {/* LEFT: Split Image Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 rounded-r-[40px] overflow-hidden shadow-2xl">
        <img
          src="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=1200"
          alt="Registration Travel"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        <div className="absolute bottom-20 left-16">
          <h1 className="text-5xl font-black text-white leading-tight">
            Join the Journey,<br />
            Join <span className="text-[#16a34a]">EasyTrip</span>
          </h1>
        </div>
      </div>

      {/* RIGHT: Register Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 overflow-hidden">
        
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="mb-6">
            <Link to="/" className="flex items-center justify-end gap-1">
              <span className="text-4xl font-black text-slate-800 tracking-tighter">Easy</span>
              <span className="text-4xl font-black text-[#16a34a] tracking-tighter">Trip</span>
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Create Account</h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              Create your account once and enjoy a seamless journey across all EasyTrip services. One account for all your travel needs.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-red-700 text-xs mb-4 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="017XXXXXXXX"
                  className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                  Confirm
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pr-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] font-bold text-slate-400 hover:text-[#16a34a] transition-colors uppercase tracking-widest"
              >
                {showPassword ? 'Hide Passwords' : 'Show Passwords'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || isFormEmpty}
              className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-black py-4 rounded-xl shadow-lg shadow-[#16a34a]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-slate-500 font-bold text-sm">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-[#16a34a] hover:underline">
                  Log In
                </Link>
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
