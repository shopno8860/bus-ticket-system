import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FaCheckCircle } from 'react-icons/fa';

const Ticket = ({ booking, ticketRef }) => {
  if (!booking) return null;

  // =======================
  // ✅ SAFE DATA
  // =======================
  const bookingReference = booking?.bookingReference ?? 'N/A';

  const busOperator = booking?.trip?.bus?.operatorName ?? 'Bus Operator';
  const busName = booking?.trip?.bus?.name ?? '';
  const busType = booking?.trip?.bus?.busType ?? 'N/A';
  const coach = booking?.trip?.bus?.registrationNumber ?? 'N/A';

  const routeFrom = booking?.trip?.route?.origin ?? 'N/A';
  const routeTo = booking?.trip?.route?.destination ?? 'N/A';

  const passengerName = booking?.passengerName ?? 'N/A';
  const contact = booking?.passengerPhone ?? 'Contact Support';

  const status = booking?.status ?? 'PENDING';
  const txn = booking?.payments?.[0]?.transactionId ?? 'N/A';

  const dateObj = new Date(booking?.trip?.departureTime);

  const date = dateObj.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const time = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const seats =
    booking?.bookingSeats?.map(s => s?.seat?.seatNumber).join(", ") || "N/A";

  // =======================
  // ✅ FARE
  // =======================
  const seatCount = booking?.bookingSeats?.length ?? 0;
  const seatPrice = Number(booking?.trip?.price ?? 0);
  const platformFeePerSeat = busType === "AC" ? 70 : 40;
  const insurancePerSeat = 10;
  const seatTotal = seatCount > 0 && seatPrice > 0
    ? seatCount * seatPrice
    : Number(booking?.totalAmount ?? 0);
  const platformFee = seatCount * platformFeePerSeat;
  const insuranceFee = seatCount * insurancePerSeat;
  const fallbackTotal = seatTotal + platformFee + insuranceFee;
  const totalPayable = Number(booking?.totalAmount ?? fallbackTotal);

  // =======================
  // ✅ DYNAMIC LOGO
  // =======================
  const getInitials = (name) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const initials = getInitials(busOperator);

  const getColor = (name) => {
    const colors = [
      { from: "#2563eb", to: "#1e40af" },
      { from: "#16a34a", to: "#15803d" },
      { from: "#9333ea", to: "#7e22ce" },
      { from: "#dc2626", to: "#b91c1c" }
    ];
    return colors[name?.length % colors.length];
  };

  const { from, to } = getColor(busOperator);

  return (
    <div className="bg-[#f5f6f8] py-10 px-4 print:bg-white print:p-0">
      <div
        id="ticket"
        ref={ticketRef}
        className="max-w-[1000px] mx-auto bg-white border border-[#e5e7eb] rounded-md shadow-sm p-6 text-[13px] text-[#111827]"
      >

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4">
          <div className="flex gap-4 items-start">

            {/* LOGO */}
            <div
              className="w-16 h-16 rounded-md flex items-center justify-center text-white font-bold text-xl shadow-sm"
              style={{ background: `linear-gradient(to bottom right, ${from}, ${to})` }}
            >
              {initials}
            </div>

            {/* TEXT */}
            <div>
              <h1 className="text-2xl font-bold">{busOperator}</h1>
              <p className="text-sm text-[#6b7280]">{busName} ({busType})</p>
              <p className="text-sm text-[#6b7280]">Dhaka, Bangladesh</p>
              <p className="text-sm">{contact}</p>
            </div>
          </div>

          {/* QR */}
          <div className="text-right">
            <QRCodeCanvas value={bookingReference} size={90} />
            <p className="text-[11px] mt-2 border px-2 py-1 inline-block rounded">
              PNR: {bookingReference}
            </p>
          </div>
        </div>

        {/* MAIN */}
        <div className="grid grid-cols-3 gap-5 mt-6">

          {/* LEFT */}
          <div className="border rounded-md p-4 space-y-4">
            <div>
              <p className="text-[11px] text-gray-400 uppercase">PNR</p>
              <p className="font-bold text-lg">{bookingReference}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">FROM</p>
              <p className="font-bold">{routeFrom}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">TO</p>
              <p className="font-bold">{routeTo}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">BOARDING POINT</p>
              <p>{routeFrom}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">DEPARTURE TIME</p>
              <p>{date}</p>
              <p className="text-green-600 font-semibold">{time}</p>
            </div>
          </div>

          {/* MIDDLE */}
          <div className="border rounded-md p-4 space-y-3">
            <div>
              <p className="text-[11px] text-gray-400 uppercase">JOURNEY DATE</p>
              <p className="font-bold">{date}</p>
              <p className="text-green-600">{time}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">BUS OPERATOR</p>
              <p>{busOperator}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">BUS TYPE</p>
              <p>{busType}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">COACH</p>
              <p>{coach}</p>
            </div>

            <div>
              <p className="text-[11px] text-gray-400 uppercase">BOOKED BY</p>
              <p>{passengerName}</p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <div className="border bg-[#eff6ff] rounded-md p-4">
              <p className="font-bold text-green-600 mb-2">PRICE DETAILS</p>

              <div className="flex justify-between">
                <span>Seat Total ({seatCount} × ৳{seatPrice})</span>
                <span>৳{seatTotal}</span>
              </div>

              <div className="flex justify-between mt-1">
                <span>Platform Fee ({seatCount} × ৳{platformFeePerSeat})</span>
                <span>৳{platformFee}</span>
              </div>

              <div className="flex justify-between mt-1">
                <span>Insurance ({seatCount} × ৳{insurancePerSeat})</span>
                <span>৳{insuranceFee}</span>
              </div>

              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-green-600">
                <span>Total Payable</span>
                <span>৳{totalPayable}</span>
              </div>
            </div>

            <div className="border border-red-300 bg-red-50 p-4 text-red-600 text-sm">
              NON-CANCELLABLE, NON-REFUNDABLE & NON-TRANSFERABLE
            </div>
          </div>
        </div>

        {/* PASSENGER */}
        <div className="grid grid-cols-4 gap-4 border mt-6 p-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase">Passenger</p>
            <p>{passengerName}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase">Seat</p>
            <p>{seats}</p>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase">Status</p>
            <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs flex items-center gap-1">
              <FaCheckCircle /> {status}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase">Transaction</p>
            <p className="text-xs">{txn}</p>
          </div>
        </div>

        {/* TERMS */}
        <div className="grid grid-cols-2 gap-6 mt-6 text-xs text-gray-600">
          <div>
            <p className="font-bold mb-2">TERMS & CONDITIONS</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Arrive 30 minutes before departure</li>
              <li>Tickets are non-refundable</li>
              <li>Carry valid ID</li>
              <li>Schedule may change</li>
            </ul>
          </div>

          <div>
            <p className="font-bold mb-2">PAYMENT INFO</p>
            <p>Method: SSLCommerz</p>
            <p>Transaction: {txn}</p>
            <p>Status: PAID</p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-6 border-t pt-4 text-green-600">
          Thank you for traveling with {busOperator}
        </div>

      </div>
    </div>
  );
};

export default Ticket;