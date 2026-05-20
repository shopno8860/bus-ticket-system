import { useMemo } from 'react';

function SeatGrid({ allSeats, selectedSeats, onSeatClick, busClass, busType, maxSelectable = 10 }) {
  const seatsByRow = useMemo(() => {
    const grouped = new Map();
    allSeats.forEach((seat) => {
      const row = Number(seat.rowNumber ?? 1);
      if (!grouped.has(row)) grouped.set(row, []);
      grouped.get(row).push(seat);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rowNumber, seats]) => ({
        rowNumber,
        seats: seats.sort((a, b) => Number(a.columnNumber) - Number(b.columnNumber)),
      }));
  }, [allSeats]);

  const businessRows = useMemo(() => {
    if (busClass !== 'BUSINESS' || busType === 'SLEEPER') return [];
    const sortedSeats = [...allSeats].sort((a, b) => {
      const byRow = Number(a.rowNumber ?? 0) - Number(b.rowNumber ?? 0);
      if (byRow !== 0) return byRow;
      return Number(a.columnNumber ?? 0) - Number(b.columnNumber ?? 0);
    });
    const rows = [];
    let cursor = 0;
    for (let row = 0; row < 8 && cursor < sortedSeats.length; row += 1) {
      rows.push({ rowNumber: row + 1, seats: sortedSeats.slice(cursor, cursor + 3) });
      cursor += 3;
    }
    if (cursor < sortedSeats.length) {
      rows.push({ rowNumber: 9, seats: sortedSeats.slice(cursor, cursor + 4) });
    }
    return rows;
  }, [allSeats, busClass, busType]);

  const sleeperDeckRows = useMemo(() => {
    if (busType !== 'SLEEPER') return { upperRows: [], lowerRows: [] };
    const upperSeats = allSeats.filter((s) => String(s.seatNumber || '').startsWith('U'));
    const lowerSeats = allSeats.filter((s) => String(s.seatNumber || '').startsWith('L'));
    const toRows = (seats) => {
      const rows = [];
      const seatsPerRow = 3;
      for (let i = 0; i < seats.length; i += seatsPerRow) {
        rows.push(seats.slice(i, i + seatsPerRow));
      }
      return rows;
    };
    return {
      upperRows: toRows(upperSeats.sort((a, b) => String(a.seatNumber).localeCompare(String(b.seatNumber)))),
      lowerRows: toRows(lowerSeats.sort((a, b) => String(a.seatNumber).localeCompare(String(b.seatNumber)))),
    };
  }, [allSeats, busType]);

  return (
    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 w-full max-w-[340px] mx-auto">
      {/* Steering area indicator */}
      <div className="flex justify-end mb-6 pr-2">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center bg-white">
          <div className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300"></div>
        </div>
      </div>

      {busType === 'SLEEPER' ? (
        <div className="space-y-4">
          <SleeperDeck title="Upper Deck" rows={sleeperDeckRows.upperRows} selectedSeats={selectedSeats} onSeatClick={onSeatClick} maxSelectable={maxSelectable} />
          <SleeperDeck title="Lower Deck" rows={sleeperDeckRows.lowerRows} selectedSeats={selectedSeats} onSeatClick={onSeatClick} maxSelectable={maxSelectable} />
        </div>
      ) : (
        <div className="flex flex-col gap-y-4">
          {(busClass === 'BUSINESS' ? businessRows : seatsByRow).map(({ rowNumber, seats: rowSeats }, rowIndex) => {
            const totalRows = busClass === 'BUSINESS' ? businessRows.length : seatsByRow.length;
            const isLastBusinessRow = busClass === 'BUSINESS' && rowIndex === totalRows - 1;
            const leftSeatCount = isLastBusinessRow ? 2 : busClass === 'BUSINESS' ? 1 : 2;

            if (busClass === 'BUSINESS') {
              return (
                <div key={rowNumber} className="flex justify-center gap-x-6 gap-y-4">
                  <div className="inline-flex items-center justify-center gap-2">
                    {rowSeats.slice(0, leftSeatCount).map((seat) => (
                      <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.includes(seat.id)} onClick={() => onSeatClick(seat)} maxSelectable={maxSelectable} selectedCount={selectedSeats.length} />
                    ))}
                    {!isLastBusinessRow ? <div className="w-8" /> : null}
                    {rowSeats.slice(leftSeatCount).map((seat) => (
                      <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.includes(seat.id)} onClick={() => onSeatClick(seat)} maxSelectable={maxSelectable} selectedCount={selectedSeats.length} />
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={rowNumber} className="flex justify-center gap-x-6 gap-y-4">
                <div className="inline-flex items-center gap-2">
                  {rowSeats.slice(0, leftSeatCount).map((seat) => (
                    <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.includes(seat.id)} onClick={() => onSeatClick(seat)} maxSelectable={maxSelectable} selectedCount={selectedSeats.length} />
                  ))}
                </div>
                <div className="inline-flex items-center gap-2">
                  {rowSeats.slice(leftSeatCount).map((seat) => (
                    <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.includes(seat.id)} onClick={() => onSeatClick(seat)} maxSelectable={maxSelectable} selectedCount={selectedSeats.length} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeatButton({ seat, isSelected, onClick, maxSelectable, selectedCount }) {
  const { seatNumber, seatState } = seat;
  const base = "w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-bold transition-all border-b-2";

  if (seatState === 'reserved') {
    return <button disabled title="Already reserved" className={`${base} bg-red-100 border-red-200 text-red-500/50 cursor-not-allowed`}>{seatNumber}</button>;
  }

  if (seatState === 'locked') {
    return <button disabled title="Temporarily locked by another user" className={`${base} bg-orange-100 border-orange-200 text-orange-500/60 cursor-not-allowed`}>{seatNumber}</button>;
  }

  if (isSelected) {
    return <button onClick={onClick} className={`${base} bg-emerald-600 border-emerald-800 text-white shadow-md active:translate-y-0.5 active:border-b-0`}>{seatNumber}</button>;
  }

  return <button onClick={onClick} className={`${base} bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200 active:translate-y-0.5 active:border-b-0`}>{seatNumber}</button>;
}

function SleeperDeck({ title, rows, selectedSeats, onSeatClick }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="space-y-2">
        {rows.map((rowSeats, rowIndex) => (
          <div key={`${title}-${rowIndex}`} className="flex items-center justify-center gap-6">
            <div className="inline-flex items-center gap-2">
              {rowSeats.slice(0, 1).map((seat) => (
                <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.includes(seat.id)} onClick={() => onSeatClick(seat)} />
              ))}
            </div>
            <div className="inline-flex items-center gap-2">
              {rowSeats.slice(1).map((seat) => (
                <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.includes(seat.id)} onClick={() => onSeatClick(seat)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SeatGrid;
