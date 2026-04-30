import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await apiFetch(endpoints.auth.forgotPassword, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccessMessage(
        response?.message ??
          'If an account with that email exists, a reset link has been sent.',
      );
      setEmail('');
    } catch (err) {
      setError(err?.message || 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-slate-800">Forgot Password</h1>
        <p className="text-slate-500 text-sm mt-2">
          Enter your account email and we will send a password reset link.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-lg bg-green-600 text-white font-semibold py-2.5 hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Back to{' '}
          <Link className="text-green-600 hover:underline font-medium" to="/auth/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
