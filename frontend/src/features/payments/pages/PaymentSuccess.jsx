import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBookingDetails } from '../../bookings/services/bookingApi';
import { generatePDFBlob } from '../../../utils/pdf';
import Ticket from '../../../components/ticket/Ticket';
import { sendConfirmationEmailWithTicket } from '../services/paymentApi';
import { showSuccess } from '../../../utils/toastHelper';

/** Dedupes ticket email across React Strict Mode remounts (refs reset; this persists). */
const ticketEmailInFlight = new Map();

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailNotice, setEmailNotice] = useState('');

  const toastStorageKey = bookingId ? `easytrip-payment-success-toast:${bookingId}` : null;
  const emailStorageKey = bookingId ? `easytrip-ticket-email-sent:${bookingId}` : null;

  useEffect(() => {
    if (!toastStorageKey || typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(toastStorageKey)) return;
    sessionStorage.setItem(toastStorageKey, '1');
    showSuccess('Payment successful');
  }, [toastStorageKey]);

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

  useEffect(() => {
    if (!booking || !emailStorageKey) return;

    const s = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    if (s?.getItem(emailStorageKey) === '1') {
      setEmailNotice('Ticket was sent to your email with the same PDF.');
      return;
    }

    const bid = booking.id;
    let sendPromise = ticketEmailInFlight.get(bid);
    if (!sendPromise) {
      sendPromise = (async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 50));
          const blob = await generatePDFBlob('ticket');
          const ticketFile = new File(
            [blob],
            `Ticket-${booking.bookingReference || booking.id}.pdf`,
            { type: 'application/pdf' },
          );
          await sendConfirmationEmailWithTicket(bid, ticketFile);
          s?.setItem(emailStorageKey, '1');
        } finally {
          ticketEmailInFlight.delete(bid);
        }
      })();
      ticketEmailInFlight.set(bid, sendPromise);
    }

    sendPromise
      .then(() => {
        if (s?.getItem(emailStorageKey) === '1') {
          setEmailNotice('Ticket was sent to your email with the same PDF.');
        }
      })
      .catch((sendError) => {
        console.error('Failed to send ticket email:', sendError);
        s?.removeItem(emailStorageKey);
        setEmailNotice('Could not send ticket email automatically.');
      });
  }, [booking, emailStorageKey]);

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
  const seatCount = booking.bookingSeats?.length ?? 0;
  const seatPrice = Number(trip?.price ?? 0);
  const busType = trip?.bus?.busType;
  const platformFeePerSeat = busType === 'NON_AC' ? 40 : 70;
  const insurancePerSeat = 10;
  const seatTotal = seatCount * seatPrice;
  const platformFee = seatCount * platformFeePerSeat;
  const insuranceFee = seatCount * insurancePerSeat;

  //  UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">

      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-6 text-center">

        {/*  Success */}
        <h2 className="text-2xl font-bold text-green-600">
           Payment Successful
        </h2>
        <p className="text-gray-500 mb-6">
          Your booking is confirmed
        </p>
        {emailNotice ? (
          <p className="text-xs text-gray-500 mb-6">{emailNotice}</p>
        ) : null}

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
            <span className="text-gray-500">Seat Total ({seatCount} × ৳{seatPrice})</span>
            <span>৳{seatTotal}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Platform Fee ({seatCount} × ৳{platformFeePerSeat})</span>
            <span>৳{platformFee}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Insurance ({seatCount} × ৳{insurancePerSeat})</span>
            <span>৳{insuranceFee}</span>
          </div>

          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-500">Total Amount</span>
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

      <div className="fixed -left-[99999px] top-0 pointer-events-none opacity-0">
        <Ticket booking={booking} ticketRef={null} />
      </div>
    </div>
  );
};

export default PaymentSuccess;