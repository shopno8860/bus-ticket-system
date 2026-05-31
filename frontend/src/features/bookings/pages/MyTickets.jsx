import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBus,
  FaCalendarAlt,
  FaChair,
  FaClock,
  FaArrowRight,
  FaTicketAlt,
  FaExclamationCircle,
  FaTimes,
  FaUndo,
} from "react-icons/fa";
import { getMyBookings, cancelBooking } from "../services/bookingApi";
import { showError, showLoading, showSuccess } from "../../../utils/toastHelper";

const MyTickets = () => {
  const cancellationPolicyItems = [
    'EasyTrip is a booking platform. Cancellations and refunds depend on each bus operator policy.',
    'Tickets can be cancelled only before departure. After departure, cancellation is not allowed.',
    'Refund rules may vary by operator. Some tickets may be non-refundable.',
    'Refund preview guideline: 24+ hours = 90%, 12+ hours = 50%, 6+ hours = 25%.',
    'Refund is usually processed within 3-7 working days after approval.',
    'A small service charge may be deducted during cancellation.',
    'No-show passengers may be treated as cancelled without refund.',
    'If operator cancels a trip, full or partial refund may apply as per operator decision.',
  ];

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    open: false,
    booking: null,
  });
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await getMyBookings();
      const data = Array.isArray(response) ? response : [];

      // Hide tickets whose departure time has already passed.
      // Keep entries with missing/invalid departureTime visible to avoid
      // accidentally hiding fresh bookings due to parsing inconsistencies.
      const now = Date.now();
      const relevantTickets = data.filter((ticket) => {
        if (!ticket?.id) return false;
        const rawDeparture = ticket?.trip?.departureTime;
        if (!rawDeparture) return true;

        const departureTime = new Date(rawDeparture).getTime();
        if (Number.isNaN(departureTime)) return true;

        return departureTime > now;
      });

      // Sort by date (nearest first)
      relevantTickets.sort((a, b) => {
        const dateA = a?.trip?.departureTime
          ? new Date(a.trip.departureTime).getTime()
          : 0;
        const dateB = b?.trip?.departureTime
          ? new Date(b.trip.departureTime).getTime()
          : 0;
        return dateA - dateB;
      });

      setTickets(relevantTickets);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load your tickets. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const refreshInterval = setInterval(() => {
      fetchTickets();
    }, 15000);

    const handleWindowFocus = () => {
      fetchTickets();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
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

  const getRefundPreview = (booking) => {
    if (!booking || !booking.trip) return 0;

    const now = new Date();
    const departure = new Date(booking.trip.departureTime);
    const diffInHours = (departure - now) / (1000 * 60 * 60);

    let percentage = 0;
    if (diffInHours >= 24) percentage = 0.9;
    else if (diffInHours >= 6) percentage = 0.5;
    else if (diffInHours >= 2) percentage = 0.25;

    return (parseFloat(booking.totalAmount) * percentage).toFixed(2);
  };

  const handleCancelClick = (e, ticket) => {
    e.stopPropagation(); // Prevent navigation to details
    setCancelModal({ open: false, booking: ticket }); // wait, open should be true
    setCancelModal({ open: true, booking: ticket });
  };

  const confirmCancellation = async () => {
    if (!cancelModal.booking) return;

    const loadingToastId = showLoading("Cancelling ticket...");
    try {
      setCancelling(true);
      await cancelBooking(cancelModal.booking.id);
      showSuccess("Ticket cancelled", { id: loadingToastId });
      showSuccess("Refund requested");
      setCancelModal({ open: false, booking: null });
      fetchTickets(); // Refresh the list
    } catch (err) {
      console.error("Cancellation error:", err);
      showError("Cancellation failed", { id: loadingToastId });
    } finally {
      setCancelling(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <span className="loading loading-spinner loading-lg text-[#16a34a]"></span>
        <p className="mt-4 text-slate-500 font-medium">
          Fetching your upcoming journeys...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <FaExclamationCircle className="text-red-500 text-5xl mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-slate-600 mb-6 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary bg-[#16a34a] hover:bg-[#15803d] border-none"
        >
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
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          No upcoming tickets found
        </h2>
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
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            My Tickets
          </h1>
          <p className="text-slate-500 font-medium">
            Your bus journeys and bookings
          </p>
        </div>
        <div className="badge badge-lg bg-[#16a34a]/10 text-[#16a34a] border-none font-bold py-4 px-6">
          {tickets.length} {tickets.length === 1 ? "Booking" : "Bookings"}
        </div>
      </div>

      <div className="grid gap-6">
        {tickets.map((ticket) => {
          const isCancelled = ticket.status === "CANCELLED";
          const canViewTicket = ticket.status === "CONFIRMED";
          const listMuted = !canViewTicket;
          const latestRefund = ticket.refunds?.[0];
          const isRefundApproved = latestRefund?.status === "APPROVED";
          const isRefundPending = latestRefund?.status === "PENDING";
          const canCancel =
            ticket.status === "CONFIRMED" &&
            (new Date(ticket.trip?.departureTime) - new Date()) /
              (1000 * 60 * 60) >=
              2;

          return (
            <div
              key={ticket.id}
              onClick={() => {
                if (canViewTicket) {
                  navigate(`/booking/${ticket.id}`);
                }
              }}
              className={`group bg-white border ${canViewTicket ? "border-slate-100 cursor-pointer" : "border-slate-200 opacity-75 cursor-default"} rounded-2xl shadow-sm hover:shadow-xl hover:border-[#16a34a]/20 transition-all duration-300 overflow-hidden flex flex-col md:flex-row`}
            >
              {/* Left Status Bar */}
              <div
                className={`w-full md:w-2 ${canViewTicket ? "bg-[#16a34a]" : "bg-slate-300"} group-hover:w-3 transition-all duration-300 h-2 md:h-auto`}
              ></div>

              <div className="flex-1 p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                {/* Route Info */}
                <div className="flex-1">
                  <div
                    className={`flex items-center gap-3 ${listMuted ? "text-slate-400" : "text-[#16a34a]"} mb-4`}
                  >
                    <FaBus className="text-sm" />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {ticket.trip?.bus?.operatorName}
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">
                        From
                      </p>
                      <p
                        className={`text-xl font-black ${listMuted ? "text-slate-400" : "text-slate-800"}`}
                      >
                        {ticket.trip?.route?.origin}
                      </p>
                      {ticket.boardingPoint?.name ? (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Board: {ticket.boardingPoint.name}
                        </p>
                      ) : null}
                    </div>
                    <FaArrowRight className="text-slate-300 mt-5" />
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">
                        To
                      </p>
                      <p
                        className={`text-xl font-black ${listMuted ? "text-slate-400" : "text-slate-800"}`}
                      >
                        {ticket.trip?.route?.destination}
                      </p>
                      {ticket.droppingPoint?.name ? (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Drop: {ticket.droppingPoint.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Journey Details */}
                <div className="flex-1 grid grid-cols-2 gap-6 border-t lg:border-t-0 lg:border-l border-slate-50 pt-6 lg:pt-0 lg:pl-8">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <FaCalendarAlt className="text-xs" />
                      <span className="text-[10px] font-bold uppercase">
                        Date
                      </span>
                    </div>
                    <p
                      className={`font-bold ${listMuted ? "text-slate-400" : "text-slate-700"}`}
                    >
                      {formatDate(ticket.trip?.departureTime)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <FaClock className="text-xs" />
                      <span className="text-[10px] font-bold uppercase">
                        Time
                      </span>
                    </div>
                    <p
                      className={`font-bold ${listMuted ? "text-slate-400" : "text-slate-700"}`}
                    >
                      {formatTime(ticket.trip?.departureTime)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <FaChair className="text-xs" />
                      <span className="text-[10px] font-bold uppercase">
                        Seats
                      </span>
                    </div>
                    <p
                      className={`font-bold ${listMuted ? "text-slate-400" : "text-slate-700"}`}
                    >
                      {ticket.bookingSeats?.length > 0
                        ? ticket.bookingSeats
                            .map((s) => s.seat.seatNumber)
                            .join(", ")
                        : "N/A (Cancelled)"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isCancelled
                            ? "bg-red-500"
                            : listMuted
                              ? "bg-slate-400"
                              : "bg-[#16a34a]"
                        }`}
                      ></div>
                      <span className="text-[10px] font-bold uppercase">
                        Status
                      </span>
                    </div>
                    <p
                      className={`font-bold text-sm uppercase tracking-tight ${
                        isCancelled
                          ? "text-red-500"
                          : listMuted
                            ? "text-slate-500"
                            : "text-[#16a34a]"
                      }`}
                    >
                      {ticket.status}
                    </p>
                  </div>
                </div>

                {/* Action/Countdown Area */}
                <div className="flex flex-row lg:flex-col justify-between items-center lg:items-end gap-4 border-t lg:border-t-0 lg:border-l border-slate-50 pt-6 lg:pt-0 lg:pl-8 min-w-[140px]">
                  <div className="text-right">
                    {isCancelled ? (
                      isRefundApproved ? (
                        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                          Refunded: {latestRefund?.amount || ticket.refundAmount || 0} BDT
                        </div>
                      ) : isRefundPending ? (
                        <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
                          Refund: Pending admin approval
                        </div>
                      ) : (
                        <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                          Refund: {latestRefund?.status || "Not requested"}
                        </div>
                      )
                    ) : (
                      <>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Countdown
                        </p>
                        <p className="text-sm font-black text-[#16a34a] bg-[#16a34a]/10 px-3 py-1 rounded-full">
                          {getCountdown(ticket.trip?.departureTime)}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col w-full gap-2 mt-auto">
                    <button
                      type="button"
                      title={
                        canViewTicket
                          ? undefined
                          : "Ticket view is available only after successful payment"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canViewTicket) {
                          navigate(`/booking/${ticket.id}`);
                        }
                      }}
                      disabled={!canViewTicket}
                      className={`w-full btn btn-sm font-bold rounded-lg transition-all ${canViewTicket ? "bg-[#16a34a] text-white hover:bg-[#15803d] border-none" : "bg-slate-100 text-slate-400 border-none cursor-not-allowed"}`}
                    >
                      View Ticket
                    </button>
                    {canCancel && (
                      <button
                        onClick={(e) => handleCancelClick(e, ticket)}
                        className="w-full btn btn-sm btn-outline btn-error font-bold rounded-lg transition-all"
                      >
                        Cancel Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModal.open && (
        <div className="modal modal-open">
          <div className="modal-box rounded-2xl border border-slate-100 shadow-2xl">
            <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
              <FaExclamationCircle className="text-red-500" />
              Cancel Booking?
            </h3>
            <p className="py-4 text-slate-600 font-medium">
              Are you sure you want to cancel your journey from{" "}
              <span className="font-black text-slate-800">
                {cancelModal.booking?.trip?.route?.origin}
              </span>{" "}
              to{" "}
              <span className="font-black text-slate-800">
                {cancelModal.booking?.trip?.route?.destination}
              </span>
              ?
            </p>

            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-500">
                  Refund Amount:
                </span>
                <span className="text-xl font-black text-red-600">
                  {getRefundPreview(cancelModal.booking)} BDT
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                *Based on our refund policy (Departure:{" "}
                {formatDate(cancelModal.booking?.trip?.departureTime)}{" "}
                {formatTime(cancelModal.booking?.trip?.departureTime)})
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <h4 className="text-sm font-black text-slate-800 mb-2">
                EasyTrip Ticket Cancellation Policy
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                {cancellationPolicyItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost rounded-xl font-bold"
                onClick={() => setCancelModal({ open: false, booking: null })}
                disabled={cancelling}
              >
                Keep Ticket
              </button>
              <button
                className={`btn bg-red-500 hover:bg-red-600 text-white border-none rounded-xl px-8 font-black ${cancelling ? "loading" : ""}`}
                onClick={confirmCancellation}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-slate-900/60"
            onClick={() => setCancelModal({ open: false, booking: null })}
          ></div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
