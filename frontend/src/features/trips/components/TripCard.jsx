import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function TripCard({ trip }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);

  const handleViewSeats = () => {
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
    <div className="bg-white rounded-[2rem] shadow-sm border border-[#e5e7eb] overflow-hidden hover:shadow-xl hover:shadow-[#16a34a]/5 transition-all duration-300 group">
      <div className="p-8">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-center">
          
          {/* 1. Operator Info (col-span-4) */}
          <div className="lg:col-span-4 w-full space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#f9fafb] rounded-2xl flex items-center justify-center border border-[#e5e7eb] group-hover:border-[#16a34a]/20 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#16a34a]/40 group-hover:text-[#16a34a] transition-colors">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a4.125 4.125 0 100-8.25 4.125 4.125 0 000 8.25zM6.75 12h.008v.008H6.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 7.5a3.375 3.375 0 100-6.75 3.375 3.375 0 000 6.75zM9.75 15.75h.008v.008H9.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM14.25 18a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM12.75 15.75h.008v.008H12.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM18 17.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 15.75h.008v.008H16.5v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM22.5 16.5a.75.75 0 100-1.5.75.75 0 000 1.5zM21 15.75h.008v.008H21v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111827] leading-tight">
                  {trip.bus?.operatorName || trip.bus?.name || 'Super Express'}
                </h3>
                <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">{trip.bus?.busType === 'AC' ? 'Luxury AC Coach' : 'Economy Non-AC'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="bg-[#f9fafb] text-xs font-bold px-3 py-1.5 text-[#6b7280] rounded-lg border border-[#e5e7eb]">{trip.route?.origin} ➔ {trip.route?.destination}</span>
            </div>
          </div>

          {/* 2. Timeline (col-span-5) */}
          <div className="lg:col-span-5 w-full">
            <div className="flex justify-between items-center relative gap-4 px-4">
              <div className="text-center z-10 flex flex-col items-start">
                <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mb-1">Departure</p>
                <div className="text-2xl font-bold text-[#111827]">{formatTime(trip.departureTime)}</div>
                <div className="text-xs font-bold text-[#6b7280] mt-1">{trip.route?.origin}</div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-2 px-2 relative min-w-[80px]">
                <div className="text-[10px] font-bold text-[#16a34a] bg-[#dcfce7] px-3 py-1 rounded-full mb-3 whitespace-nowrap">
                  {calculateDuration(trip.departureTime, trip.arrivalTime)}
                </div>
                <div className="w-full h-px bg-[#e5e7eb] relative">
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 w-4 h-4 bg-white border border-[#e5e7eb] rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#e5e7eb] rounded-full"></div>
                  </div>
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-4 bg-white border border-[#e5e7eb] rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#16a34a] rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="text-center z-10 flex flex-col items-end">
                <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mb-1">Arrival</p>
                <div className="text-2xl font-bold text-[#111827]">{formatTime(trip.arrivalTime)}</div>
                <div className="text-xs font-bold text-[#6b7280] mt-1">{trip.route?.destination}</div>
              </div>
            </div>
          </div>

          {/* 3. Price & Checkout (col-span-3) */}
          <div className="lg:col-span-3 w-full lg:pl-10 lg:border-l border-[#e5e7eb] space-y-4">
            <div className="text-center lg:text-right">
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mb-1">Fare (per seat)</p>
              <div className="text-4xl font-bold text-[#111827]">৳{trip.price}</div>
              <p className="text-xs font-bold text-[#6b7280] mt-2">
                <span className="text-[#16a34a]">{trip.availableSeats || 20}</span> Seats Available
              </p>
            </div>
            <button 
              onClick={handleViewSeats}
              className="btn bg-[#16a34a] hover:bg-[#15803d] w-full h-[3.5rem] rounded-2xl shadow-xl shadow-[#16a34a]/20 text-white font-bold tracking-wide border-none transition-all hover:scale-[1.02]"
            >
              BOOK TICKET
            </button>
          </div>
        </div>
      </div>

      {/* 4. Secondary Action Bar */}
      <div className="bg-[#f9fafb] border-t border-[#e5e7eb] px-8 py-3 flex flex-wrap gap-4">
        {[
          { id: 'policy', label: 'Cancellation Policy' },
          { id: 'boarding', label: 'Boarding Point' },
          { id: 'dropping', label: 'Dropping Point' },
          { id: 'amenities', label: 'Amenities' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${activeTab === tab.id ? 'bg-[#16a34a] text-white shadow-md' : 'text-[#6b7280] hover:text-[#111827] hover:bg-[#e5e7eb]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expandable Content Area */}
      {activeTab && (
        <div className="p-8 bg-[#f9fafb] border-t border-[#e5e7eb] transition-all animate-in fade-in slide-in-from-top-4">
           {activeTab === 'policy' && (
             <div className="flex gap-4 items-start">
               <div className="badge border-[#f97316] text-[#f97316] p-4 font-bold bg-[#fff7ed]">Important</div>
               <p className="text-sm text-[#111827] font-medium leading-relaxed">
                 Cancellations made 24 hours before journey are eligible for a 90% refund. 
                 Inside 24 hours, only a 50% refund is applicable. No refund for no-shows.
               </p>
             </div>
           )}
           {activeTab === 'amenities' && (
             <div className="flex flex-wrap gap-4">
               {['Water Bottle', 'Blanket', 'Pillow', 'WIFI', 'Mobile Charging Port'].map(amenity => (
                 <div key={amenity} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-[#e5e7eb]">
                    <div className="w-2 h-2 rounded-full bg-[#16a34a]/40"></div>
                    <span className="text-xs font-bold text-[#111827]">{amenity}</span>
                 </div>
               ))}
             </div>
           )}
           {activeTab === 'boarding' && (
             <div className="text-sm text-[#111827] font-bold">
               Gabtoli (Main Counter) - 30 mins before departure
             </div>
           )}
           {activeTab === 'dropping' && (
             <div className="text-sm text-[#111827] font-bold">
               GEC Circle - Drop off point
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default TripCard;
