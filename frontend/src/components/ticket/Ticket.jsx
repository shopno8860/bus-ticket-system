import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  const basePrice = Number(booking?.totalAmount ?? 0);
  const serviceCharge = Number(booking?.serviceCharge ?? 40);
  const insurance = Number(booking?.insurance ?? 10);
  const total = basePrice + serviceCharge + insurance;

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
      "from-blue-600 to-blue-800",
      "from-green-600 to-green-800",
      "from-purple-600 to-purple-800",
      "from-red-600 to-red-800"
    ];
    return colors[name?.length % colors.length];
  };

  const gradient = getColor(busOperator);

  // =======================
  // 🎫 UI
  // =======================
  return (
    <div className="bg-[#f5f6f8] py-10 px-4">
      <div
        id="ticket"
        ref={ticketRef}
        className="max-w-[1000px] mx-auto bg-white border border-[#e5e7eb] rounded-md shadow-sm p-6 text-[13px] text-[#111827]"
      >

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4">
          <div className="flex gap-4 items-start">

            {/* 🔥 DYNAMIC LOGO */}
            <div
              className={`w-16 h-16 rounded-md flex items-center justify-center 
              text-white font-bold text-xl shadow-sm bg-gradient-to-br ${gradient}`}
            >
              {initials}
            </div>

            {/* TEXT */}
            <div>
              <h1 className="text-2xl font-bold">{busOperator}</h1>
              <p className="text-sm text-[#6b7280]">{busName} ({busType})</p>
              <p className="text-sm text-[#6b7280]">Dhaka, Bangladesh</p>
              <p className="text-sm"> {contact}</p>
            </div>
          </div>

          {/* QR */}
          <div className="text-right">
            <QRCodeSVG value={bookingReference} size={90} />
            <p className="text-[11px] mt-2 border border-[#e5e7eb] px-2 py-1 inline-block rounded">
              PNR: {bookingReference}
            </p>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-3 gap-5 mt-6">

          {/* LEFT */}
          <div className="border border-[#e5e7eb] rounded-md p-4 space-y-4">
            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">PNR</p>
              <p className="font-bold text-lg">{bookingReference}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">FROM</p>
              <p className="font-bold">{routeFrom}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">TO</p>
              <p className="font-bold">{routeTo}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">BOARDING POINT</p>
              <p>{routeFrom}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">DEPARTURE TIME</p>
              <p className="font-medium">{date}</p>
              <p className="text-[#16a34a] font-semibold">{time}</p>
            </div>
          </div>

          {/* MIDDLE */}
          <div className="border border-[#e5e7eb] rounded-md p-4 space-y-3">
            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">JOURNEY DATE</p>
              <p className="font-bold">{date}</p>
              <p className="text-[#16a34a]">{time}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">BUS OPERATOR</p>
              <p>{busOperator}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">BUS TYPE</p>
              <p>{busType}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">COACH / BUS NO.</p>
              <p>{coach}</p>
            </div>

            <div>
              <p className="text-[11px] text-[#9ca3af] uppercase">BOOKED BY</p>
              <p>{passengerName}</p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">

            {/* FARE */}
            <div className="border border-[#dbeafe] bg-[#eff6ff] rounded-md p-4">
              <p className="text-green-600 font-bold mb-2">
                FARE DETAILS
              </p>

              <div className="flex justify-between">
                <span>Ticket Price</span>
                <span>BDT {basePrice}</span>
              </div>

              <div className="flex justify-between">
                <span>+ Service Charge</span>
                <span>BDT {serviceCharge}</span>
              </div>

              <div className="flex justify-between">
                <span>+ Insurance</span>
                <span>BDT {insurance}</span>
              </div>

              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-[#16a34a]">
                <span>TOTAL AMOUNT</span>
                <span>BDT {total}</span>
              </div>
            </div>

            {/* WARNING */}
            <div className="border border-[#fecaca] bg-[#fef2f2] p-4 text-[#dc2626] text-sm rounded">
              <p className="font-bold">
                NON-CANCELLABLE, NON-REFUNDABLE & NON-TRANSFERABLE
              </p>
            </div>
          </div>
        </div>

        {/* PASSENGER */}
        <div className="grid grid-cols-4 gap-4 border border-[#e5e7eb] mt-6 p-3 text-sm">
          <div>
            <p className="text-[11px] text-[#9ca3af] uppercase">PASSENGER NAME</p>
            <p>{passengerName}</p>
          </div>

          <div>
            <p className="text-[11px] text-[#9ca3af] uppercase">SEAT(S)</p>
            <p>{seats}</p>
          </div>

          <div>
            <p className="text-[11px] text-[#9ca3af] uppercase">STATUS</p>
            <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs flex items-center gap-1 w-fit">
              <FaCheckCircle /> {status}
            </span>
          </div>

          <div>
            <p className="text-[11px] text-[#9ca3af] uppercase">TRANSACTION ID</p>
            <p className="text-xs">{txn}</p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center text-sm mt-6 border-t border-[#e5e7eb] pt-4 text-green-600">
          Thank you for traveling with {busOperator}
        </div>

      </div>
    </div>
  );
};

export default Ticket;