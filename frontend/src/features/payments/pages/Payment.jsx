import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPayment } from '../services/paymentApi';

const Payment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [error, setError] = useState(null);

  // Guard ref: ensures initiatePayment() runs only once even in React Strict Mode
  // (which mounts → unmounts → remounts every component in development).
  const hasInitiated = useRef(false);

  useEffect(() => {
    // Redirect immediately if no booking data was passed
    if (!state?.booking) {
      navigate('/', { replace: true });
      return;
    }

    // Prevent a second call from the Strict Mode double-mount
    if (hasInitiated.current) return;
    hasInitiated.current = true;

    const initiatePayment = async () => {
      try {
        const { id } = state.booking;

        const response = await createPayment({
          bookingId: id,
          method: 'BKASH',
        });

        if (response?.paymentUrl) {
          // Hard-redirect to the payment gateway
          window.location.href = response.paymentUrl;
        } else {
          throw new Error('No payment URL received from server.');
        }
      } catch (err) {
        const status = err?.status ?? err?.response?.status;

        // 409 means a payment already exists for this booking.
        // The backend now returns the existing paymentUrl in that case,
        // so this branch should rarely be reached — but handle it gracefully.
        if (status === 409 && err?.data?.paymentUrl) {
          window.location.href = err.data.paymentUrl;
          return;
        }

        console.error('Payment initiation failed:', err);
        setError(err?.message || 'Payment initiation failed. Please try again.');
      }
    };

    initiatePayment();
  }, [state, navigate]);

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / redirecting state ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-5">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">Redirecting to Payment</h2>
        <p className="text-gray-500 text-sm">Please wait while we secure your connection…</p>
      </div>
    </div>
  );
};

export default Payment;
