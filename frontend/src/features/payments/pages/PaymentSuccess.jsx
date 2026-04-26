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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg text-green-500"></div>
          <p className="text-slate-400 font-medium animate-pulse">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">{error || 'Booking Not Found'}</h2>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
          >
            Go back to Home
          </button>
        </div>
      </div>
    );
  }

  const { trip, payments, passengerName, bookingReference, totalAmount, status } = booking;
  const payment = payments && payments.length > 0 ? payments[0] : null;
  const journeyDate = new Date(trip.departureTime).toLocaleDateString('en-BD', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  const journeyTime = new Date(trip.departureTime).toLocaleTimeString('en-BD', {
    hour: '2-digit', minute: '2-digit'
  });
  const seatNumbers = booking.bookingSeats.map(bs => bs.seat.seatNumber).join(', ');

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-700">
        
        {/* Top Header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Booking Confirmed!</h1>
            <p className="text-green-100 font-medium">Thank you for traveling with us</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-8">
          
          {/* Main Ticket Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bus Operator</p>
                <p className="text-xl font-bold text-white">{trip.bus.operatorName}</p>
                <p className="text-xs text-slate-400">{trip.bus.name} ({trip.bus.busType})</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">From</p>
                    <p className="text-lg font-bold text-white leading-none">{trip.route.origin}</p>
                  </div>
                </div>
                <div className="w-px h-6 bg-slate-800 ml-1"></div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">To</p>
                    <p className="text-lg font-bold text-white leading-none">{trip.route.destination}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between md:block md:space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Journey Date</p>
                  <p className="text-lg font-bold text-white">{journeyDate}</p>
                  <p className="text-sm font-semibold text-green-500">{journeyTime}</p>
                </div>
                <div className="md:mt-6">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Seat(s)</p>
                  <p className="text-lg font-bold text-white">{seatNumbers}</p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Passenger & Transaction Info */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Passenger</p>
              <p className="text-sm font-bold text-white">{passengerName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                status === 'CONFIRMED' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
              }`}>
                {status}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Amount Paid</p>
              <p className="text-xl font-black text-white">৳{totalAmount}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reference ID</p>
              <p className="text-xs font-mono text-slate-400">{bookingReference}</p>
            </div>
            {payment && (
              <div className="col-span-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Transaction ID</p>
                <p className="text-sm font-mono text-slate-300">{payment.transactionId}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/booking/${bookingId}`)}
              className="group bg-white text-slate-950 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all hover:bg-green-500 hover:text-white flex items-center justify-center gap-2 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
              </svg>
              View Ticket
            </button>
            <button
              className="bg-slate-800 text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all hover:bg-slate-700 flex items-center justify-center gap-2 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={() => navigate('/')}
              className="sm:col-span-2 bg-transparent hover:bg-white/5 text-slate-500 hover:text-white py-3 rounded-2xl font-bold text-xs tracking-widest transition-all uppercase"
            >
              Return to Home
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
