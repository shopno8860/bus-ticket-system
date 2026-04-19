import React from "react";

const SeatGrid = ({ seats, selectedSeats, onSeatClick }) => {
  // Group seats by rows
  const rows = [];
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4));
  }

  return (
    <div className="bg-white border rounded-2xl p-3 shadow-sm">
      <div className="max-w-[280px] mx-auto bg-slate-50 p-3 rounded-[2rem] border border-slate-200 relative">
        {/* Compact Steering Area */}
        <div className="flex justify-end mb-4 pr-2">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center">
             <div className="w-4 h-4 rounded-full bg-slate-200"></div>
          </div>
        </div>

        {/* Seat Grid: 5 columns (2 seats, 1 aisle, 2 seats) */}
        <div className="grid grid-cols-5 gap-2 items-center">
          {rows.map((rowSeats, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {/* Left Side */}
              <div className="col-span-2 flex gap-2 justify-end">
                {rowSeats.slice(0, 2).map((seat) => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeats.includes(seat.id)}
                    onClick={() => onSeatClick(seat)}
                  />
                ))}
              </div>

              {/* Aisle */}
              <div className="col-span-1 text-center text-[10px] font-bold text-slate-300">
                {String.fromCharCode(65 + rowIndex)}
              </div>

              {/* Right Side */}
              <div className="col-span-2 flex gap-2 justify-start">
                {rowSeats.slice(2, 4).map((seat) => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeats.includes(seat.id)}
                    onClick={() => onSeatClick(seat)}
                  />
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const Seat = ({ seat, isSelected, onClick }) => {
  const { id, isBooked } = seat;

  const base = "w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all border-b-2";

  if (isBooked) {
    return (
      <button disabled className={`${base} bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed`}>
        {id}
      </button>
    );
  }

  if (isSelected) {
    return (
      <button onClick={onClick} className={`${base} bg-green-500 border-green-700 text-white shadow-md active:translate-y-0.5 active:border-b-0`}>
        {id}
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`${base} bg-white border-slate-200 text-slate-500 hover:bg-slate-50 active:translate-y-0.5 active:border-b-0`}>
      {id}
    </button>
  );
};

export default SeatGrid;
