import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPayment } from '../services/paymentApi';
import {
  dismissToast,
  showError,
  showInfo,
  showLoading,
} from '../../../utils/toastHelper';

function resolvePaymentDeadlineMs(state, booking) {
  const hold = state?.seatHoldExpiresAt;
  if (typeof hold === 'number' && Number.isFinite(hold)) {
    return hold;
  }
  if (booking?.paymentExpiresAt) {
    return new Date(booking.paymentExpiresAt).getTime();
  }
  return null;
}

const Payment = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [error, setError] = useState(null);

  const hasInitiated = useRef(false);

  const booking = state?.booking;
  const tripId = state?.tripId ?? booking?.tripId;
  const seatHoldExpiresAt = state?.seatHoldExpiresAt;

  // No on-screen counter: redirect to seat selection when booking-page seat hold ends (seatHoldExpiresAt), else paymentExpiresAt
  useEffect(() => {
    if (!tripId || !booking) return undefined;

    const deadlineMs = resolvePaymentDeadlineMs({ seatHoldExpiresAt }, booking);
    if (deadlineMs == null || !Number.isFinite(deadlineMs)) return undefined;

    const msLeft = deadlineMs - Date.now();
    if (msLeft <= 0) {
      showError('Your seat hold expired. Please select seats again.');
      navigate(`/seats/${tripId}`, { replace: true });
      return undefined;
    }

    const id = setTimeout(() => {
      showError('Your seat hold expired. Please select seats again.');
      navigate(`/seats/${tripId}`, { replace: true });
    }, msLeft);

    return () => clearTimeout(id);
  }, [booking?.id, booking?.paymentExpiresAt, navigate, tripId, seatHoldExpiresAt]);

  useEffect(() => {
    if (!booking) {
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

    const deadlineMs = resolvePaymentDeadlineMs({ seatHoldExpiresAt }, booking);
    if (deadlineMs == null || !Number.isFinite(deadlineMs)) {
      setError('This booking has no payment window. Please select seats again.');
      return;
    }

    if (deadlineMs <= Date.now()) {
      showError('Your seat hold expired. Please select seats again.');
      navigate(`/seats/${tripId}`, { replace: true });
      return;
    }

    if (hasInitiated.current) return;
    hasInitiated.current = true;

    const initiatePayment = async () => {
      const loadingToastId = showLoading('Processing payment...');
      try {
        const { id } = booking;

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
  }, [booking, navigate, tripId, seatHoldExpiresAt]);

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
      <div className="text-center space-y-5">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">Redirecting to Payment</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Please wait while we connect you to the payment page. If your seat hold from the booking
          step runs out before payment is completed, this booking will be cancelled and you will need
          to select seats again.
        </p>
      </div>
    </div>
  );
};

export default Payment;
