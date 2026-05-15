import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { confirmBooking } from "../services/bookingApi";
import { useAuth } from "../../auth/context/AuthContext";
import { showError, showSuccess } from "../../../utils/toastHelper";

const BookingPage = () => {
  // Booking details are passed from SeatSelection via `navigate("/booking", { state })`.
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // Safety check: if user directly opens this page without navigation state, redirect path is unknown.
  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No booking data found</p>
          <button onClick={() => navigate("/")} className="btn btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  const { tripId, selectedSeats, selectedSeatNumbers, seatPrice, busType, lockExpiresAt } = state;

  // Passenger info defaults to logged-in user's saved profile (if available).
  const [name, setName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [loading, setLoading] = useState(false);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Initialize and persist timer (seat hold from backend lockExpiresAt; matches SEAT_SELECTION_LOCK_MINUTES)
  useEffect(() => {
    // Persist lock expiry time in localStorage so refresh/back doesn't reset the countdown.
    // This timer represents seat lock window before the user confirms booking/payment.
    const storageKey = `lock_expiry_${tripId}`;
    const stored = localStorage.getItem(storageKey);
    let expiryMs;
    if (stored != null && stored !== "") {
      expiryMs = Number(stored);
      if (!Number.isFinite(expiryMs)) {
        expiryMs = null;
      }
    }
    if (expiryMs == null && lockExpiresAt) {
      expiryMs = new Date(lockExpiresAt).getTime();
      localStorage.setItem(storageKey, String(expiryMs));
    }
    if (expiryMs == null) {
      expiryMs = Date.now() + 2 * 60 * 1000;
      localStorage.setItem(storageKey, String(expiryMs));
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const distance = expiryMs - now;

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        setIsExpired(true);
        localStorage.removeItem(storageKey);
      } else {
        setTimeLeft(Math.floor(distance / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tripId, lockExpiresAt]);

  // Handle auto-expiry action (seat hold before payment)
  useEffect(() => {
    // When lock expires, we send the user back to seat selection to lock again.
    if (isExpired) {
      showError("Your seat hold expired. Please select seats again.");
      navigate(`/seats/${tripId}`, { replace: true });
    }
  }, [isExpired, navigate, tripId]);

  const formatTime = (seconds) => {
    // Renders countdown as MM:SS for the UI.
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Price Calculation
  // Fees are per seat (platform fee varies by bus type; insurance fixed).
  const feePerSeat = busType === "NON_AC" ? 40 : 70;
  const insurancePerSeat = 10;
  const seatTotal = selectedSeats.length * seatPrice;
  const platformFee = selectedSeats.length * feePerSeat;
  const insuranceFee = selectedSeats.length * insurancePerSeat;
  const total = seatTotal + platformFee + insuranceFee;

  // Booking handler
  const handleBooking = async () => {
    // Confirms the PENDING booking (created during seat lock) for the logged-in user,
    // then navigates to Payment page while preserving the remaining seat-hold time.
    if (!name || !phone) {
      showError("Please enter name and phone");
      return;
    }

    if (!user || !token) {
      showError("Please login to continue");
      navigate("/auth/login");
      return;
    }

    try {
      setLoading(true);

      // Payload uses seat IDs (not seat numbers) because backend expects DB IDs.
      const payload = {
        tripId,
        seatIds: selectedSeats, // These are the database UUIDs
        passengerName: name,
        passengerPhone: phone,
      };

      console.log("Sending payload:", payload);

      const res = await confirmBooking(payload);

      console.log("Booking success:", res);

      const storageKey = `lock_expiry_${tripId}`;
      let seatHoldExpiresAtMs = null;
      const stored = localStorage.getItem(storageKey);
      if (stored != null && stored !== "") {
        const n = Number(stored);
        if (Number.isFinite(n)) seatHoldExpiresAtMs = n;
      }
      if (seatHoldExpiresAtMs == null && lockExpiresAt) {
        seatHoldExpiresAtMs = new Date(lockExpiresAt).getTime();
      }
      if (seatHoldExpiresAtMs == null) {
        seatHoldExpiresAtMs = Date.now() + 2 * 60 * 1000;
      }

      // Cleanup: booking is confirmed, so we don't need the lock timer key anymore.
      localStorage.removeItem(storageKey);
      showSuccess("Booking confirmed");

      navigate("/payment", {
        state: {
          booking: res,
          tripId: res.tripId,
          seatHoldExpiresAt: seatHoldExpiresAtMs,
        },
      });

    } catch (err) {
      console.error("Booking error details:", err);
      if (err.status === 401) {
        showError("Booking failed");
        navigate("/auth/login");
        return;
      }
      const raw = err?.data?.message ?? err?.message;
      const msg = Array.isArray(raw)
        ? raw.join(" ")
        : String(raw ?? "Booking failed");
      showError(msg);
      if (
        err.status === 400 &&
        msg.toLowerCase().includes("already booked 4 ticket") &&
        msg.toLowerCase().includes("next day")
      ) {
        window.alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section: Title & Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Booking Summary
          </h2>

          {timeLeft !== null && (
            <div className={`px-5 py-3 rounded-2xl border flex items-center gap-4 transition-all duration-500 shadow-sm ${
              timeLeft < 60 
                ? "bg-red-50 border-red-200 text-red-600 animate-pulse" 
                : "bg-white border-gray-200 text-gray-700"
            }`}>
              <div className={`p-2 rounded-xl ${timeLeft < 60 ? "bg-red-100" : "bg-green-50 text-green-600"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 leading-none mb-1">
                  {timeLeft < 60 ? "Hurry! Expiring" : "Seats Reserved"}
                </span>
                <span className="font-mono text-xl font-black leading-none">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-6">

            {/* Seats */}
            <div className="bg-white p-5 rounded-xl shadow-sm border">
              <p className="text-sm text-gray-500 mb-1 font-bold uppercase tracking-wider">Selected Seats</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {(selectedSeatNumbers || selectedSeats).map(seat => (
                  <span key={seat} className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg font-bold text-sm">
                    {seat}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 font-medium">
                Total {selectedSeats.length} Seat(s) selected
              </p>
            </div>

            {/* Passenger Info */}
            <div className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                Passenger Information
              </p>

              <div className="space-y-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Full Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter passenger name"
                    className="input input-bordered w-full rounded-lg bg-gray-50 focus:bg-white transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Phone Number</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter phone number"
                    className="input input-bordered w-full rounded-lg bg-gray-50 focus:bg-white transition-all"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border h-fit space-y-6">

            <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">
              Price Details
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Seat Total ({selectedSeats.length} × ৳{seatPrice})</span>
                <span className="font-semibold text-gray-800">৳{seatTotal}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Platform Fee ({selectedSeats.length} × ৳{feePerSeat})</span>
                <span className="font-semibold text-gray-800">৳{platformFee}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Insurance Fee ({selectedSeats.length} × ৳{insurancePerSeat})</span>
                <span className="font-semibold text-gray-800">৳{insuranceFee}</span>
              </div>

              <div className="border-t border-dashed pt-4 flex justify-between items-center">
                <span className="font-bold text-gray-800">Total Payable</span>
                <span className="text-2xl font-bold text-green-600">৳{total}</span>
              </div>
            </div>

            <button
              onClick={handleBooking}
              disabled={!name || !phone || loading || isExpired}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-sm tracking-widest transition-all shadow-lg shadow-green-100 uppercase disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="loading loading-spinner loading-xs"></span>
                  PROCESSING...
                </div>
              ) : "Proceed to Payment"}
            </button>

            <p className="text-[10px] text-center text-gray-400 font-medium leading-relaxed">
              By clicking "Confirm Booking", you agree to our <br />
              <span className="underline cursor-pointer">Terms & Conditions</span> and <span className="underline cursor-pointer">Privacy Policy</span>
            </p>

          </div>

        </div>
      </div>
    </div>
  );
};

export default BookingPage;
