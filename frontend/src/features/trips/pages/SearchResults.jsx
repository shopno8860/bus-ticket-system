import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tripApi } from '../services/tripApi';
import TripCard from '../components/TripCard';
import FilterSidebar from '../components/FilterSidebar';

function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';

  // Search Form State (For editing)
  const [searchData, setSearchData] = useState({
    from: from,
    to: to,
    date: date
  });

  const [allTrips, setAllTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter States
  const [filters, setFilters] = useState({
    busTypes: [],
    operator: '',
    boardingPoint: '',
    droppingPoint: ''
  });

  // Sort State
  const [sortBy, setSortBy] = useState('cheapest'); // 'cheapest', 'expensive'

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      setError(null);
      try {
        const tripsData = await tripApi.getTrips(from, to, date);
        console.log('Real Trips Data from Backend:', tripsData);

        const mappedTrips = tripsData.map(trip => ({
          ...trip,
          availableSeats: trip.availableSeats ?? trip.bus?.seatCapacity ?? 40
        }));

        setAllTrips(mappedTrips);
      } catch (err) {
        console.error('Fetch Error:', err);
        setError(err.message || 'Something went wrong while fetching trips.');
      } finally {
        setLoading(false);
      }
    };

    if (from || to || date) {
      fetchTrips();
    } else {
      setLoading(false);
    }
  }, [from, to, date]);

  // Derived filtered and sorted trips
  const filteredTrips = useMemo(() => {
    let result = [...allTrips];

    // Filter by Bus Type
    if (filters.busTypes.length > 0) {
      result = result.filter(trip => filters.busTypes.includes(trip.bus?.busType));
    }

    // Filter by Operator
    if (filters.operator) {
      result = result.filter(trip => 
        (trip.bus?.operatorName || trip.bus?.name) === filters.operator
      );
    }

    // Sorting
    if (sortBy === 'cheapest') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'expensive') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return result;
  }, [allTrips, filters, sortBy]);

  const availableOperators = useMemo(() => {
    const ops = allTrips.map(t => t.bus?.operatorName || t.bus?.name).filter(Boolean);
    return [...new Set(ops)];
  }, [allTrips]);

  const handleResetFilters = () => {
    setFilters({
      busTypes: [],
      operator: '',
      boardingPoint: '',
      droppingPoint: ''
    });
  };

  const displayDate = useMemo(() => {
    if (!date) return 'Not selected';
    try {
      return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return date;
    }
  }, [date]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchData.from) params.set('from', searchData.from);
    if (searchData.to) params.set('to', searchData.to);
    if (searchData.date) params.set('date', searchData.date);
    navigate(`/trips?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] py-10 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Modern Search Bar at Top */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#e5e7eb]">
          <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-end gap-6">
            <div className="w-full">
              <label className="label py-1">
                <span className="label-text text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">From</span>
              </label>
              <input 
                type="text" 
                placeholder="From City" 
                className="input input-bordered w-full rounded-xl bg-[#f9fafb] border-[#e5e7eb] text-sm font-bold text-[#111827] focus:outline-none focus:border-[#16a34a]"
                value={searchData.from}
                onChange={(e) => setSearchData(prev => ({ ...prev, from: e.target.value }))}
                required
              />
            </div>
            <div className="w-full">
              <label className="label py-1">
                <span className="label-text text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">To</span>
              </label>
              <input 
                type="text" 
                placeholder="To City" 
                className="input input-bordered w-full rounded-xl bg-[#f9fafb] border-[#e5e7eb] text-sm font-bold text-[#111827] focus:outline-none focus:border-[#16a34a]"
                value={searchData.to}
                onChange={(e) => setSearchData(prev => ({ ...prev, to: e.target.value }))}
                required
              />
            </div>
            <div className="w-full">
              <label className="label py-1">
                <span className="label-text text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Journey Date</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full rounded-xl bg-[#f9fafb] border-[#e5e7eb] text-sm font-bold text-[#111827] focus:outline-none focus:border-[#16a34a]"
                value={searchData.date}
                onChange={(e) => setSearchData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="w-full lg:w-auto">
              <button 
                type="submit" 
                className="btn bg-[#16a34a] hover:bg-[#15803d] text-white w-full lg:w-auto px-10 h-[3rem] rounded-xl border-none font-bold tracking-wide shadow-lg shadow-[#16a34a]/20"
              >
                MODIFY SEARCH
              </button>
            </div>
          </form>
        </div>


        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Sidebar (Desktop) */}
          <div className="hidden lg:block lg:col-span-3">
             <FilterSidebar 
                filters={filters} 
                setFilters={setFilters} 
                onReset={handleResetFilters}
                availableOperators={availableOperators}
             />
          </div>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Sorting & Stats Top Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-[#e5e7eb] shadow-sm gap-4">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowMobileFilters(true)}
                    className="lg:hidden btn btn-ghost btn-sm text-[#6b7280] gap-2 border-[#e5e7eb]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-9.75 0h9.75" />
                    </svg>
                    Filters
                  </button>
                  <p className="text-sm font-bold text-[#6b7280]">
                    Showing <span className="text-[#111827]">{filteredTrips.length}</span> results found
                  </p>
               </div>
               
               <div className="flex bg-[#f9fafb] p-1.5 rounded-2xl gap-2">
                  <button 
                    onClick={() => setSortBy('cheapest')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${sortBy === 'cheapest' ? 'bg-white text-[#16a34a] shadow-sm' : 'text-[#6b7280] hover:text-[#111827]'}`}
                  >
                    Low to High
                  </button>
                  <button 
                    onClick={() => setSortBy('expensive')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${sortBy === 'expensive' ? 'bg-white text-[#16a34a] shadow-sm' : 'text-[#6b7280] hover:text-[#111827]'}`}
                  >
                    High to low
                  </button>
               </div>
            </div>

            {/* Content States */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-[#e5e7eb] animate-pulse">
                <div className="w-16 h-16 border-4 border-[#16a34a] border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-[#6b7280] font-bold tracking-widest uppercase text-xs">Fetching best routes...</p>
              </div>
            ) : error ? (
              <div className="alert bg-red-50 text-red-700 rounded-[2rem] p-8 shadow-xl shadow-red-100 border border-red-100">
                <div className="flex gap-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-10 w-10" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <h3 className="text-xl font-bold">Connection Error</h3>
                    <p className="text-sm opacity-90 font-medium mt-1">{error}</p>
                    <button onClick={() => window.location.reload()} className="btn btn-sm bg-white border-red-200 text-red-700 mt-4 rounded-lg">Retry Fetch</button>
                  </div>
                </div>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-[#e5e7eb] p-10">
                <div className="bg-[#f9fafb] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm3.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[#111827] mb-3">No Buses Found</h2>
                <p className="text-[#6b7280] max-w-sm mx-auto font-medium">We couldn't find any trips matching your filters. Try adjusting your preferences or searching for a different date.</p>
                <button 
                  onClick={handleResetFilters} 
                  className="btn bg-[#16a34a] hover:bg-[#15803d] mt-10 px-12 rounded-2xl shadow-lg shadow-[#16a34a]/20 text-white border-none"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid gap-8">
                {filteredTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-300">
          <div 
             className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm"
             onClick={() => setShowMobileFilters(false)}
          ></div>
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-left duration-300 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-[#111827]">Filters</h2>
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="btn btn-ghost btn-circle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <FilterSidebar 
                filters={filters} 
                setFilters={setFilters} 
                onReset={handleResetFilters}
                availableOperators={availableOperators}
             />
             <button 
               onClick={() => setShowMobileFilters(false)}
               className="btn bg-[#16a34a] hover:bg-[#15803d] w-full mt-8 rounded-2xl text-white border-none"
             >
               Apply Filters
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchResults;
