import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showError } from '../../../utils/toastHelper';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  const payment = searchParams.get('payment');
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;

    if (payment === 'time_expired') {
      showError('Time expired for payment');
    } else {
      showError('Payment failed');
    }

    const t = setTimeout(() => {
      navigate(tripId ? `/seats/${tripId}` : '/trips', { replace: true });
    }, 500);

    return () => clearTimeout(t);
  }, [navigate, tripId, payment]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center space-y-6 border border-red-100">
        <div className="w-20 h-20 flex items-center justify-center bg-red-100 rounded-full mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10 text-red-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-gray-900">Payment Failed</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            {tripId
              ? 'Taking you back to seat selection…'
              : 'Taking you to trip search…'}
          </p>
        </div>

        <div className="pt-2">
          <div className="loading loading-spinner loading-md text-red-500 mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
