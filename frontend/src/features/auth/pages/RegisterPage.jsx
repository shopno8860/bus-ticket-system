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

      // Payload matching backend DTO
      await register({ fullName, email, phoneNumber, password });
    } catch (err) {
      // Handle array of errors from backend if it's a JSON response
      if (err.message && err.message.startsWith('{')) {
        try {
          const parsed = JSON.parse(err.message);
          if (Array.isArray(parsed.message)) {
            setError(parsed.message.join(', '));
          } else {
            setError(parsed.message || 'Registration failed');
          }
        } catch {
          setError(err.message);
        }
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-[#16a34a] p-8 text-center">
          <h2 className="text-3xl font-bold text-white">Create Account</h2>
          <p className="text-white/80 mt-2">Join EasyTrip for better travel experience</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm break-words">
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-600 block">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-600 block">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-600 block">Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="017XXXXXXXX"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 outline-none transition-all"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-600 block">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-600 block">Confirm</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 outline-none transition-all"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#16a34a]/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              'Create Account'
            )}
          </button>
          
          <div className="text-center pt-2">
            <p className="text-slate-500">
              Already have an account?{' '}
              <Link to="/auth/login" className="font-bold text-[#16a34a] hover:underline">
                Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
