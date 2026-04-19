import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

function SeatSelection() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  // Mock Ticket Price
  const TICKET_PRICE = 500;

  // Generate Mock Seat Data (40 seats: A1-A4 ... J1-J4)
  const mockSeats = useMemo(() => {
    const seats = [];
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

    rows.forEach((row) => {
      for (let i = 1; i <= 4; i++) {
        seats.push({
          id: `${row}${i}`,
          isBooked: Math.random() < 0.2, // ~20% seats are booked
        });
      }
    });
    return seats;
  }, []);

  const [selectedSeats, setSelectedSeats] = useState([]);

  const handleSeatClick = (seat) => {
    if (seat.isBooked) return;

    setSelectedSeats((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((s) => s !== seat.id);
      } else {
        return [...prev, seat.id];
      }
    });
  };

  const totalPrice = selectedSeats.length * TICKET_PRICE;

  const handleProceed = () => {
    if (selectedSeats.length === 0) return;
    // Navigate to booking with state
    navigate("/booking/summary", {
      state: {
        tripId,
        selectedSeats,
        totalPrice,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Seat Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-10">
              <h1 className="text-2xl font-black text-slate-800">
                Choose Seats
              </h1>
              <div className="badge badge-outline badge-md text-slate-400">
                TRIP ID: {tripId}
              </div>
            </div>

            {/* Seat Legend */}
            <div className="flex flex-wrap gap-6 mb-12 bg-slate-50 p-4 rounded-2xl justify-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-white border border-slate-200"></div>
                <span className="text-sm font-bold text-slate-500">
                  Available
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-green-500"></div>
                <span className="text-sm font-bold text-slate-500">
                  Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-red-100 border border-red-200 text-red-500 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-slate-500">Booked</span>
              </div>
            </div>

            {/* Bus Layout Container */}
            <div className="relative max-w-sm mx-auto bg-slate-100 p-8 rounded-[40px] border-4 border-slate-200 shadow-inner">
              {/* Driver Seat Area */}
              <div className="flex justify-end mb-12 border-b-2 border-slate-200 pb-4">
                <div className="w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-slate-300"></div>
                </div>
              </div>

              {/* Seat Grid (2-Aisle-2) */}
              <div className="grid grid-cols-5 gap-y-4 items-center">
                {/* Row Labels & Seats */}
                {Array.from({ length: 10 }).map((_, rowIndex) => {
                  const rowSeats = mockSeats.slice(
                    rowIndex * 4,
                    (rowIndex + 1) * 4,
                  );
                  return (
                    <React.Fragment key={rowIndex}>
                      {/* First 2 seats */}
                      <div className="flex gap-2 justify-center">
                        {rowSeats.slice(0, 2).map((seat) => (
                          <button
                            key={seat.id}
                            disabled={seat.isBooked}
                            onClick={() => handleSeatClick(seat)}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 
                                ${
                                  seat.isBooked
                                    ? "bg-red-100 border border-red-200 text-red-400 cursor-not-allowed"
                                    : selectedSeats.includes(seat.id)
                                      ? "bg-green-500 text-white shadow-lg shadow-green-200 scale-105"
                                      : "bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:scale-105"
                                }`}
                          >
                            {seat.id}
                          </button>
                        ))}
                      </div>

                      {/* Aisle */}
                      <div className="w-full text-center py-2">
                        {/* Aisle Space */}
                      </div>

                      {/* Last 2 seats */}
                      <div className="flex gap-2 justify-center">
                        {rowSeats.slice(2, 4).map((seat) => (
                          <button
                            key={seat.id}
                            disabled={seat.isBooked}
                            onClick={() => handleSeatClick(seat)}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 
                                ${
                                  seat.isBooked
                                    ? "bg-red-100 border border-red-200 text-red-400 cursor-not-allowed"
                                    : selectedSeats.includes(seat.id)
                                      ? "bg-green-500 text-white shadow-lg shadow-green-200 scale-105"
                                      : "bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:scale-105"
                                }`}
                          >
                            {seat.id}
                          </button>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summary Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 sticky top-10 space-y-8">
            <div>
              <h2 className="text-xl font-black text-slate-800 mb-6">
                Booking Details
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    Per Seat
                  </span>
                  <span className="font-bold text-slate-700">
                    ৳{TICKET_PRICE}
                  </span>
                </div>
                <div className="h-px bg-slate-100"></div>
                <div className="space-y-2">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    Selected Seats
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.length === 0 ? (
                      <span className="text-slate-300 italic text-sm">
                        No seats picked yet
                      </span>
                    ) : (
                      selectedSeats.map((id) => (
                        <div
                          key={id}
                          className="badge badge-success text-white font-bold p-3"
                        >
                          {id}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl space-y-2">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Total Amount
              </p>
              <p className="text-4xl font-black text-primary">৳{totalPrice}</p>
            </div>

            <button
              onClick={handleProceed}
              disabled={selectedSeats.length === 0}
              className="btn btn-primary w-full btn-lg rounded-2xl shadow-xl shadow-primary/20 text-white font-black tracking-wide disabled:bg-slate-100 disabled:text-slate-400"
            >
              Proceed to Booking
            </button>
            <p className="text-center text-slate-400 text-xs font-medium">
              By proceeding, you agree to our terms & conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeatSelection;
