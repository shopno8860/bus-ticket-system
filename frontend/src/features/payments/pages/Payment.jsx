import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPayment } from '../services/paymentApi';
import {
  dismissToast,
  showError,
  showInfo,
  showLoading,
} from '../../../utils/toastHelper';

const formatTime = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return '00:00';
  const secs = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const Payment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [error, setError] = useState(null);
  const [timeLeftSec, setTimeLeftSec] = useState(null);

  const hasInitiated = useRef(false);

  const booking = state?.booking;
  const tripId = state?.tripId ?? booking?.tripId;

  // Countdown for payment window (server paymentExpiresAt)
  useEffect(() => {
    if (!booking?.paymentExpiresAt || !tripId) return undefined;

    const deadline = new Date(booking.paymentExpiresAt).getTime();

    const tick = () => {
      const left = Math.floor((deadline - Date.now()) / 1000);
      if (left <= 0) {
        setTimeLeftSec(0);
        return false;
      }
      setTimeLeftSec(left);
      return true;
    };

    if (!tick()) {
      showError('Time expired for payment');
      navigate(`/seats/${tripId}`, { replace: true });
      return undefined;
    }

    const id = setInterval(() => {
      if (!tick()) {
        clearInterval(id);
        showError('Time expired for payment');
        navigate(`/seats/${tripId}`, { replace: true });
      }
    }, 1000);

    return () => clearInterval(id);
  }, [booking, navigate, tripId]);

  useEffect(() => {
    if (!state?.booking) {
      navigate('/', { replace: true });
      return;
    }

    if (!tripId) {
      setError('Missing trip information. Please start again from seat selection.');
      return;
    }

    if (!booking?.paymentExpiresAt) {
      setError('This booking has no payment window. Please select seats again.');
      return;
    }

    const deadline = new Date(booking.paymentExpiresAt).getTime();
    if (deadline <= Date.now()) {
      showError('Time expired for payment');
      navigate(`/seats/${tripId}`, { replace: true });
      return;
    }

    if (hasInitiated.current) return;
    hasInitiated.current = true;

    const initiatePayment = async () => {
      const loadingToastId = showLoading('Processing payment...');
      try {
        const { id } = state.booking;

        const response = await createPayment({
          bookingId: id,
          method: 'BKASH',
        });

        if (response?.paymentUrl) {
          dismissToast(loadingToastId);
          showInfo('Redirecting to the payment page…', { duration: 2500 });
          try {
            sessionStorage.setItem('sslcommerz_pending_trip_id', tripId);
          } catch {
            // ignore
          }
          window.location.href = response.paymentUrl;
        } else {
          throw new Error('No payment URL received from server.');
        }
      } catch (err) {
        const status = err?.status ?? err?.response?.status;

        if (status === 409 && err?.data?.paymentUrl) {
          dismissToast(loadingToastId);
          showInfo('Redirecting to the payment page…', { duration: 2500 });
          try {
            sessionStorage.setItem('sslcommerz_pending_trip_id', tripId);
          } catch {
            // ignore
          }
          window.location.href = err.data.paymentUrl;
          return;
        }

        console.error('Payment initiation failed:', err);
        showError('Payment failed', { id: loadingToastId });
        setError(err?.message || 'Payment initiation failed. Please try again.');
      }
    };

    initiatePayment();
  }, [state, navigate, booking, tripId]);

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
            type="button"
            onClick={() => navigate(tripId ? `/seats/${tripId}` : '/trips', { replace: true })}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition-all"
          >
            Back to seat selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 gap-6">
      {timeLeftSec !== null && tripId ? (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-sm ${
            timeLeftSec < 60
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-800'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
            Pay within
          </span>
          <span className="font-mono text-2xl font-black tabular-nums">
            {formatTime(timeLeftSec)}
          </span>
        </div>
      ) : null}
      <div className="text-center space-y-5">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">Redirecting to Payment</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Please wait while we secure your connection. If you do not pay before the timer ends, your
          seats will be released.
        </p>
      </div>
    </div>
  );
};

export default Payment;
