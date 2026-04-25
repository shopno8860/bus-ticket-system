import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { confirmBooking } from "../services/bookingApi";

const BookingPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Safety check
  if (!state) {
    return <p className="text-center mt-10">No booking data found</p>;
  }

  const { tripId, selectedSeats, seatPrice, busType } = state;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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

    try {
      setLoading(true);

const payload = {
  tripId,
  seatIds: selectedSeats,
  passengerName: name,
  passengerPhone: phone,
  userId: "test-user",
};

      console.log("Sending payload:", payload);

      const res = await confirmBooking(payload);

      console.log("Booking success:", res);

      alert("Booking Confirmed!");

      navigate("/payment", {
        state: { booking: res },
      });

    } catch (err) {
      console.error(err);
      alert(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
              <p className="text-sm text-gray-500 mb-1">Selected Seats</p>
              <p className="font-semibold text-gray-800">
                {selectedSeats.join(", ")}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {selectedSeats.length} Seat(s)
              </p>
            </div>

            {/* Passenger Info */}
            <div className="bg-white p-5 rounded-xl shadow-sm border space-y-3">
              <p className="text-sm font-semibold text-gray-600">
                Passenger Information
              </p>

              <input
                type="text"
                placeholder="Full Name"
                className="input input-bordered w-full rounded-lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="text"
                placeholder="Phone Number"
                className="input input-bordered w-full rounded-lg"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="bg-white p-5 rounded-xl shadow-sm border h-fit space-y-4">

            <p className="text-sm font-semibold text-gray-600">
              Price Details
            </p>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Seat Total</span>
              <span className="font-medium">৳{seatTotal}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee</span>
              <span className="font-medium">৳{platformFee}</span>
            </div>

            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-green-600">৳{total}</span>
            </div>

            <button
              onClick={handleBooking}
              disabled={!name || !phone || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition disabled:bg-gray-300"
            >
              {loading ? "Processing..." : "Confirm Booking"}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default BookingPage;