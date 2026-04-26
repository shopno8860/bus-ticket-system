import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBus, FaCalendarAlt, FaChair, FaClock, FaArrowRight, FaTicketAlt, FaExclamationCircle } from 'react-icons/fa';
import { getMyBookings } from '../services/bookingApi';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const data = await getMyBookings();
        
        // Filter FUTURE tickets only (departureTime > current time)
        const now = new Date();
        const futureTickets = data.filter(ticket => {
          const departureDate = new Date(ticket.trip?.departureTime);
          return departureDate > now;
        });

        // Sort by date (nearest first)
        futureTickets.sort((a, b) => new Date(a.trip.departureTime) - new Date(b.trip.departureTime));

        setTickets(futureTickets);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError('Failed to load your tickets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCountdown = (dateString) => {
    const now = new Date();
    const departure = new Date(dateString);
    const diff = departure - now;
    
    if (diff < 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <span className="loading loading-spinner loading-lg text-[#16a34a]"></span>
        <p className="mt-4 text-slate-500 font-medium">Fetching your upcoming journeys...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <FaExclamationCircle className="text-red-500 text-5xl mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h2>
        <p className="text-slate-600 mb-6 max-w-md">{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary bg-[#16a34a] hover:bg-[#15803d] border-none">
          Try Again
        </button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <FaTicketAlt className="text-slate-300 text-4xl" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No upcoming tickets found</h2>
        <p className="text-slate-500 mb-8 max-w-sm">
          You don't have any future trips booked. Ready for your next adventure?
        </p>
        <Link 
          to="/" 
          className="btn btn-primary bg-[#16a34a] hover:bg-[#15803d] border-none px-8 rounded-full"
        >
          Buy a Ticket
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Tickets</h1>
          <p className="text-slate-500 font-medium">Your upcoming bus journeys</p>
        </div>
        <div className="badge badge-lg bg-[#16a34a]/10 text-[#16a34a] border-none font-bold py-4 px-6">
          {tickets.length} Upcoming {tickets.length === 1 ? 'Trip' : 'Trips'}
        </div>
      </div>

      <div className="grid gap-6">
        {tickets.map((ticket) => (
          <div 
            key={ticket.id}
            onClick={() => navigate(`/booking/${ticket.id}`)}
            className="group bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-[#16a34a]/20 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col md:flex-row"
          >
            {/* Left Status Bar */}
            <div className="w-full md:w-2 bg-[#16a34a] group-hover:w-3 transition-all duration-300 h-2 md:h-auto"></div>

            <div className="flex-1 p-6 md:p-8 flex flex-col lg:flex-row gap-8">
              {/* Route Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 text-[#16a34a] mb-4">
                  <FaBus className="text-sm" />
                  <span className="text-xs font-black uppercase tracking-widest">{ticket.trip?.bus?.operatorName}</span>
                </div>
                
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">From</p>
                    <p className="text-xl font-black text-slate-800">{ticket.trip?.route?.origin}</p>
                  </div>
                  <FaArrowRight className="text-slate-300 mt-5" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">To</p>
                    <p className="text-xl font-black text-slate-800">{ticket.trip?.route?.destination}</p>
                  </div>
                </div>
              </div>

              {/* Journey Details */}
              <div className="flex-1 grid grid-cols-2 gap-6 border-t lg:border-t-0 lg:border-l border-slate-50 pt-6 lg:pt-0 lg:pl-8">
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <FaCalendarAlt className="text-xs" />
                    <span className="text-[10px] font-bold uppercase">Date</span>
                  </div>
                  <p className="font-bold text-slate-700">{formatDate(ticket.trip?.departureTime)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <FaClock className="text-xs" />
                    <span className="text-[10px] font-bold uppercase">Time</span>
                  </div>
                  <p className="font-bold text-slate-700">{formatTime(ticket.trip?.departureTime)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <FaChair className="text-xs" />
                    <span className="text-[10px] font-bold uppercase">Seats</span>
                  </div>
                  <p className="font-bold text-slate-700">
                    {ticket.bookingSeats?.map(s => s.seat.seatNumber).join(', ')}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[#16a34a]"></div>
                    <span className="text-[10px] font-bold uppercase">Status</span>
                  </div>
                  <p className="font-bold text-[#16a34a] text-sm uppercase tracking-tight">{ticket.status}</p>
                </div>
              </div>

              {/* Action/Countdown Area */}
              <div className="flex flex-row lg:flex-col justify-between items-center lg:items-end gap-4 border-t lg:border-t-0 lg:border-l border-slate-50 pt-6 lg:pt-0 lg:pl-8 min-w-[140px]">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Countdown</p>
                  <p className="text-sm font-black text-[#16a34a] bg-[#16a34a]/10 px-3 py-1 rounded-full">
                    {getCountdown(ticket.trip?.departureTime)}
                  </p>
                </div>
                <div className="btn btn-ghost btn-circle text-[#16a34a] group-hover:bg-[#16a34a] group-hover:text-white transition-all duration-300">
                  <FaTicketAlt />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyTickets;
