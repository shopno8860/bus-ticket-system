import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

const SeatSelection = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const PRICE_PER_SEAT = 550; // Dynamic pricing can be added later

  // Generate 40 seats (A1...J4) - Mocking availability for production-ready frontend
  const allSeats = useMemo(() => {
    const seats = [];
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    rows.forEach((row) => {
      for (let i = 1; i <= 4; i++) {
        seats.push({
          id: `${row}${i}`,
          isBooked: Math.random() < 0.15, // ~15% booked
        });
      }
    });
    return seats;
  }, []);

  const handleSeatClick = (seat) => {
    if (seat.isBooked) return;
    setSelectedSeats((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((s) => s !== seat.id);
      } else {
        if (prev.length >= 4) {
          alert("Maximum 4 seats selectable");
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  const totalPrice = selectedSeats.length * PRICE_PER_SEAT;

  const handleContinue = () => {
    if (selectedSeats.length === 0) return;
    navigate("/booking", {
      state: {
        tripId,
        selectedSeats,
        seatPrice: PRICE_PER_SEAT,
        busType: "AC",
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 md:flex md:items-center md:justify-center p-0 md:p-4">
      {/* Container: Centered max-w-xl */}
      <div className="w-full max-w-xl mx-auto bg-white flex flex-col h-screen md:h-auto md:min-h-[600px] relative shadow-md md:rounded-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center border-b">
          <h1 className="text-lg font-bold">Select Seats</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 text-2xl px-2 hover:text-gray-600 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Seat Layout Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-6">
          {/* Seat Legend: Available, Sold, Selected */}
          <div className="flex gap-5 text-[10px] font-bold uppercase text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-200"></div>{" "}
              Avail
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-red-100 border border-red-200"></div>{" "}
              Sold
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-green-600"></div> Selected
            </div>
          </div>

          {/* Seat Grid: 5 columns (2-1-2) */}
          <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 w-full max-w-[300px]">
            {/* Steering area indicator */}
            <div className="flex justify-end mb-6 pr-2">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-200"></div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 items-center justify-center">
              {Array.from({ length: 10 }).map((_, rowIndex) => {
                const rowSeats = allSeats.slice(
                  rowIndex * 4,
                  (rowIndex + 1) * 4,
                );
                return (
                  <React.Fragment key={rowIndex}>
                    {/* Left 2 Seats */}
                    <div className="col-span-2 flex gap-2 justify-end">
                      {rowSeats.slice(0, 2).map((seat) => (
                        <SeatButton
                          key={seat.id}
                          seat={seat}
                          isSelected={selectedSeats.includes(seat.id)}
                          onClick={() => handleSeatClick(seat)}
                        />
                      ))}
                    </div>

                    {/* Aisle */}
                    <div className="col-span-1 text-center text-[10px] font-bold text-gray-300">
                      {String.fromCharCode(65 + rowIndex)}
                    </div>

                    {/* Right 2 Seats */}
                    <div className="col-span-2 flex gap-2 justify-start">
                      {rowSeats.slice(2, 4).map((seat) => (
                        <SeatButton
                          key={seat.id}
                          seat={seat}
                          isSelected={selectedSeats.includes(seat.id)}
                          onClick={() => handleSeatClick(seat)}
                        />
                      ))}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Sticky Bottom */}
        <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] sticky bottom-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                Seats Selected
              </span>
              <span className="text-lg font-bold text-gray-900">
                {selectedSeats.length || 0} Seat(s)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                Total Price
              </span>
              <span className="text-lg font-bold text-green-600">
                ৳{totalPrice}
              </span>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={selectedSeats.length === 0}
            className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-sm tracking-widest disabled:bg-gray-100 disabled:text-gray-300 transition-all active:scale-[0.98] shadow-lg shadow-green-100 uppercase"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
};

// Seat Button Component
const SeatButton = ({ seat, isSelected, onClick }) => {
  const { id, isBooked } = seat;
  const base =
    "w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all border-b-2";

  if (isBooked) {
    return (
      <button
        disabled
        className={`${base} bg-red-100 border-red-200 text-red-500/50 cursor-not-allowed`}
      >
        {id}
      </button>
    );
  }

  if (isSelected) {
    return (
      <button
        onClick={onClick}
        className={`${base} bg-green-600 border-green-800 text-white shadow-md active:translate-y-0.5 active:border-b-0`}
      >
        {id}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${base} bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200 active:translate-y-0.5 active:border-b-0`}
    >
      {id}
    </button>
  );
};

export default SeatSelection;
