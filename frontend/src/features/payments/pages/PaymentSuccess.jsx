import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBookingDetails } from '../../bookings/services/bookingApi';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) {
      setError('Invalid booking information.');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const data = await getBookingDetails(bookingId);
        setBooking(data);
      } catch (err) {
        console.error('Failed to fetch booking:', err);
        setError('Could not retrieve booking details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [bookingId]);

  // 🔄 Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 animate-pulse">
          Verifying your payment...
        </p>
      </div>
    );
  }

  // ❌ Error
  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-6 rounded-xl shadow text-center max-w-md w-full">
          <h2 className="text-xl font-bold text-red-500 mb-3">
            {error || 'Booking Not Found'}
          </h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 w-full bg-gray-800 text-white py-2 rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ✅ Data extract
  const { trip, payments, passengerName, totalAmount } = booking;
  const payment = payments?.[0];

  const journeyDate = new Date(trip.departureTime).toLocaleDateString();
  const journeyTime = new Date(trip.departureTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const seatNumbers = booking.bookingSeats
    .map(bs => bs.seat.seatNumber)
    .join(', ');

  // ✅ UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">

      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-6 text-center">

        {/* ✅ Success */}
        <h2 className="text-2xl font-bold text-green-600">
          ✅ Payment Successful
        </h2>
        <p className="text-gray-500 mb-6">
          Your booking is confirmed
        </p>

        {/* 📄 Booking Info */}
        <div className="text-left text-sm space-y-3 mb-6">

          <div className="flex justify-between">
            <span className="text-gray-500">Route</span>
            <span className="font-semibold">
              {trip.route.origin} → {trip.route.destination}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span>{journeyDate}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span>{journeyTime}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Seat</span>
            <span>{seatNumbers}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Passenger</span>
            <span>{passengerName}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-bold">৳{totalAmount}</span>
          </div>

        </div>

        {/* 💳 Transaction */}
        {payment && (
          <div className="text-xs text-gray-400 mb-6 break-all">
            TXN: {payment.transactionId}
          </div>
        )}

        {/* 🔘 Actions */}
        <div className="space-y-3">

          <button
            onClick={() => navigate(`/booking/${bookingId}`)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            View Ticket
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full border border-gray-300 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Go Home
          </button>

        </div>

      </div>
    </div>
  );
};

export default PaymentSuccess;