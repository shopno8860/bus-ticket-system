import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function TripCard({ trip }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);

  const handleBookTicket = () => {
    navigate(`/seats/${trip.id}`);
  };

  const formatTime = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return dateStr;
    }
  };

  const calculateDuration = (start, end) => {
    try {
      const diff = new Date(end) - new Date(start);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${mins}m`;
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* LEFT SECTION: Bus Info */}
          <div className="flex-1 w-full text-center md:text-left space-y-1">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {trip.bus?.operatorName || trip.bus?.name || 'Super Express'}
            </h3>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {trip.bus?.busType === 'AC' ? 'Luxury AC Coach' : 'Economy Non-AC'}
            </p>
            <p className="text-xs text-gray-400 font-medium">
              {trip.route?.origin} ➔ {trip.route?.destination}
            </p>
          </div>

          {/* MIDDLE SECTION: Timeline */}
          <div className="flex-[1.5] w-full py-4 md:py-0 border-y md:border-y-0 border-gray-50">
            <div className="flex justify-between items-center gap-4 px-2">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-800">{formatTime(trip.departureTime)}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{trip.route?.origin}</div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full mb-1">
                  {calculateDuration(trip.departureTime, trip.arrivalTime)}
                </div>
                <div className="w-full flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full border border-gray-300"></div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xl font-bold text-gray-800">{formatTime(trip.arrivalTime)}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{trip.route?.destination}</div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: Price & Action */}
          <div className="flex-1 w-full text-center md:text-right space-y-3">
            <div>
              <div className="text-2xl font-bold text-gray-900">৳{trip.price}</div>
              <p className="text-xs font-semibold text-gray-500 italic">
                {trip.availableSeats || 20} Seats Available
              </p>
            </div>
            <button 
              onClick={handleBookTicket}
              className="btn bg-[#16a34a] hover:bg-[#15803d] text-white w-full h-12 rounded-lg border-none font-bold tracking-wide shadow-sm transition-all active:scale-95"
            >
              BOOK TICKET
            </button>
          </div>
        </div>
      </div>

      {/* Extra Links (Cancellation, Policy, etc.) - Scaled down for cleanliness */}
      <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-2.5 flex flex-wrap gap-x-6 gap-y-2">
        {['Cancellation Policy', 'Boarding Point', 'Dropping Point', 'Amenities'].map(label => (
          <button 
            key={label}
            className="text-[10px] font-bold text-gray-400 hover:text-green-600 uppercase tracking-wider transition-colors"
            onClick={() => setActiveTab(activeTab === label ? null : label)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expandable Content area (Simplified) */}
      {activeTab && (
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            {activeTab === 'Cancellation Policy' && "Cancellations allowed up to 24 hours before departure with a 10% fee."}
            {activeTab === 'Amenities' && "Water Bottle, Blanket, Pillow, Reading Light."}
            {activeTab === 'Boarding Point' && `${trip.route?.origin} Central Bus Terminal`}
            {activeTab === 'Dropping Point' && `${trip.route?.destination} Junction Counter`}
          </p>
        </div>
      )}
    </div>
  );
}

export default TripCard;
