import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center space-y-6 border border-green-100">
        <div className="w-20 h-20 flex items-center justify-center bg-green-100 rounded-full mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10 text-green-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your booking has been confirmed. You can view your ticket details in your profile.
          </p>
        </div>

        <div className="pt-4 space-y-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-200"
          >
            View My Tickets
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

export default PaymentSuccess;
