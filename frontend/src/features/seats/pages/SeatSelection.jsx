import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const SeatSelection = () => {
  const navigate = useNavigate();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const PRICE_PER_SEAT = 550;

  // Generate 40 seats (A1...J4)
  const allSeats = useMemo(() => {
    const seats = [];
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    rows.forEach((row) => {
      for (let i = 1; i <= 4; i++) {
        seats.push({
          id: `${row}${i}`,
          isBooked: Math.random() < 0.2, // ~20% booked
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

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans antialiased text-gray-800">
      {/* Mobile Style Container */}
      <div className="w-full max-w-md bg-white flex flex-col h-screen relative shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-3 flex justify-between items-center border-b">
          <h1 className="text-lg font-bold">Select Seats</h1>
          <button onClick={() => navigate(-1)} className="text-gray-400 text-2xl">&times;</button>
        </div>

        {/* Seat Layout Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4">
          
          {/* Legend */}
          <div className="flex gap-4 text-[10px] font-bold uppercase text-gray-400">
             <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded bg-gray-200"></div> Avail
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded bg-red-500"></div> Sold
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 rounded bg-green-500"></div> Selected
             </div>
          </div>

          {/* Bus Grid */}
          <div className="bg-gray-50 p-3 rounded-3xl border border-gray-100">
            {/* Front indicator */}
            <div className="flex justify-end mb-4 pr-1">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200"></div>
            </div>

            <div className="grid grid-cols-5 gap-2 items-center">
              {Array.from({ length: 10 }).map((_, rowIndex) => {
                const rowSeats = allSeats.slice(rowIndex * 4, (rowIndex + 1) * 4);
                return (
                  <React.Fragment key={rowIndex}>
                    {/* Left 2 Seats */}
                    <div className="col-span-2 flex gap-2">
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
                    <div className="col-span-2 flex gap-2">
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

        {/* Bottom Panel */}
        <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Seats Loaded</span>
              <span className="text-xl font-bold">{selectedSeats.length || 0} Seat(s)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</span>
              <span className="text-xl font-bold text-green-600">৳{totalPrice}</span>
            </div>
          </div>
          
          <button
            onClick={() => alert("Booking initiated...")}
            disabled={selectedSeats.length === 0}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-sm tracking-widest disabled:bg-gray-100 disabled:text-gray-300 transition-transform active:scale-95 shadow-lg shadow-green-100"
          >
            CONTINUE
          </button>
        </div>

      </div>
    </div>
  );
};

// Simple Component for Seat
const SeatButton = ({ seat, isSelected, onClick }) => {
  const { id, isBooked } = seat;
  const base = "w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors";

  if (isBooked) {
    return (
      <button disabled className={`${base} bg-red-100 text-red-400 cursor-not-allowed`}>
        {id}
      </button>
    );
  }

  if (isSelected) {
    return (
      <button onClick={onClick} className={`${base} bg-green-500 text-white shadow-lg`}>
        {id}
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`${base} bg-gray-200 text-gray-500 hover:bg-gray-300`}>
      {id}
    </button>
  );
};

export default SeatSelection;
