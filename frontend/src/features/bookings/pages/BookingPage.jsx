import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { confirmBooking } from "../services/bookingApi";
import { useAuth } from "../../auth/context/AuthContext";

const BookingPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Safety check
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

  const { tripId, selectedSeats, selectedSeatNumbers, seatPrice, busType } = state;

  const [name, setName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [loading, setLoading] = useState(false);

  // Price Calculation
  const feePerSeat = busType === "AC" ? 70 : 40;
  const seatTotal = selectedSeats.length * seatPrice;
  const platformFee = selectedSeats.length * feePerSeat;
  const total = seatTotal + platformFee;

  // Booking handler
  const handleBooking = async () => {
    if (!name || !phone) {
      alert("Please enter name and phone");
      return;
    }

    if (!user) {
      alert("Please login to continue");
      navigate("/auth/login");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        tripId,
        seatIds: selectedSeats, // These are the database UUIDs
        passengerName: name,
        passengerPhone: phone,
        userId: user.id,
      };

      console.log("Sending payload:", payload);

      const res = await confirmBooking(payload);

      console.log("Booking success:", res);

      alert("Booking Confirmed!");

      navigate("/payment", {
        state: { booking: res },
      });

    } catch (err) {
      console.error("Booking error details:", err);
      alert(err.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Booking Summary
        </h2>

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
                <span className="text-gray-500">Platform Fee</span>
                <span className="font-semibold text-gray-800">৳{platformFee}</span>
              </div>

              <div className="border-t border-dashed pt-4 flex justify-between items-center">
                <span className="font-bold text-gray-800">Total Payable</span>
                <span className="text-2xl font-bold text-green-600">৳{total}</span>
              </div>
            </div>

            <button
              onClick={handleBooking}
              disabled={!name || !phone || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-sm tracking-widest transition-all shadow-lg shadow-green-100 uppercase disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="loading loading-spinner loading-xs"></span>
                  PROCESSING...
                </div>
              ) : "Confirm Booking"}
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