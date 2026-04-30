import React from 'react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError } from '../../../utils/toastHelper';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;
    showError('Payment failed');
  }, []);

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
            We couldn't process your payment. Your seat lock has been released. Please try booking again.
          </p>
        </div>

        <div className="pt-4 space-y-3">
          <button
            onClick={() => navigate('/trips')}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-200"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-4 rounded-xl font-bold text-sm transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
