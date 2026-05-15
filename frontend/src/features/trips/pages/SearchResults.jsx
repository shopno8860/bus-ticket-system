import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tripApi } from '../services/tripApi';
import TripCard from '../components/TripCard';
import FilterSidebar from '../components/FilterSidebar';
import TripSearchForm from '../components/TripSearchForm';
import { showError } from '../../../utils/toastHelper';

function SearchResults() {
  const toLocalIsoDate = (inputDate) => {
    const year = inputDate.getFullYear();
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const day = String(inputDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
  const apiErrorShownRef = useRef(false);
  const noTripsToastKeyRef = useRef('');

  // Filter States
  const [filters, setFilters] = useState({
    busTypes: [],
    busClasses: [],
    operator: '',
    boardingPoint: '',
    droppingPoint: '',
    minPrice: '',
    maxPrice: ''
  });

  // Sort State
  const [sortBy, setSortBy] = useState('departure'); // 'departure', 'cheapest', 'expensive'
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 6;

  useEffect(() => {
    setSearchData({
      from,
      to,
      date,
    });
  }, [from, to, date]);

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      setError(null);
      try {
        const tripsData = await tripApi.getTrips(from, to, date, {
          busTypes: filters.busTypes,
          busClasses: filters.busClasses,
          boardingPoint: filters.boardingPoint,
          droppingPoint: filters.droppingPoint,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        });
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
  }, [
    from,
    to,
    date,
    filters.busTypes,
    filters.busClasses,
    filters.boardingPoint,
    filters.droppingPoint,
    filters.minPrice,
    filters.maxPrice,
  ]);

  // Derived filtered and sorted trips
  const filteredTrips = useMemo(() => {
    let result = [...allTrips];

    // Filter by Operator
    if (filters.operator) {
      result = result.filter(trip => 
        (trip.bus?.operatorName || trip.bus?.name) === filters.operator
      );
    }

    // Sorting
    if (sortBy === 'departure') {
      result.sort(
        (a, b) =>
          new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime(),
      );
    } else if (sortBy === 'cheapest') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'expensive') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return result;
  }, [allTrips, filters, sortBy]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTrips.length / tripsPerPage)),
    [filteredTrips.length],
  );

  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * tripsPerPage;
    return filteredTrips.slice(startIndex, startIndex + tripsPerPage);
  }, [filteredTrips, currentPage]);

  const availableOperators = useMemo(() => {
    const ops = allTrips.map(t => t.bus?.operatorName || t.bus?.name).filter(Boolean);
    return [...new Set(ops)];
  }, [allTrips]);

  const availableBoardingPoints = useMemo(() => {
    const points = allTrips.map(t => t.boardingPoint || t.route?.origin).filter(Boolean);
    return [...new Set(points)];
  }, [allTrips]);

  const availableDroppingPoints = useMemo(() => {
    const points = allTrips.map(t => t.droppingPoint || t.route?.destination).filter(Boolean);
    return [...new Set(points)];
  }, [allTrips]);

  const handleResetFilters = () => {
    setFilters({
      busTypes: [],
      busClasses: [],
      operator: '',
      boardingPoint: '',
      droppingPoint: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [from, to, date, filters, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  const handleSwap = () => {
    setSearchData(prev => ({
      ...prev,
      from: prev.to,
      to: prev.from
    }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchData.from) params.set('from', searchData.from);
    if (searchData.to) params.set('to', searchData.to);
    if (searchData.date) params.set('date', searchData.date);
    navigate(`/trips?${params.toString()}`);
  };

  const dateStripDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <15; i += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push({
        iso: toLocalIsoDate(day),
        dayLabel: day.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: day.toLocaleDateString('en-US', { day: 'numeric' }),
        monthLabel: day.toLocaleDateString('en-US', { month: 'short' }),
      });
    }

    return days;
  }, []);

  const activeDateIso = useMemo(() => {
    if (searchData.date) {
      const parsed = new Date(searchData.date);
      if (!Number.isNaN(parsed.getTime())) {
        return toLocalIsoDate(parsed);
      }
    }
    return dateStripDays[0]?.iso ?? '';
  }, [searchData.date, dateStripDays]);
  const noTripsToastKey = useMemo(
    () =>
      [
        from,
        to,
        date,
        filters.operator,
        filters.minPrice,
        filters.maxPrice,
        filters.boardingPoint,
        filters.droppingPoint,
        filters.busTypes.join(','),
        filters.busClasses.join(','),
      ].join('|'),
    [from, to, date, filters],
  );

  useEffect(() => {
    if (loading) return;

    if (error) {
      if (!apiErrorShownRef.current) {
        showError('Failed to load trips');
        apiErrorShownRef.current = true;
      }
      return;
    }

    apiErrorShownRef.current = false;

    if ((from || to || date) && filteredTrips.length === 0 && noTripsToastKeyRef.current !== noTripsToastKey) {
      showError('No trips available');
      noTripsToastKeyRef.current = noTripsToastKey;
    }
  }, [loading, error, filteredTrips.length, from, to, date, noTripsToastKey]);

  const handleDateChipClick = (nextDateIso) => {
    setSearchData((prev) => ({ ...prev, date: nextDateIso }));

    const params = new URLSearchParams();
    const nextFrom = from || searchData.from;
    const nextTo = to || searchData.to;
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    params.set('date', nextDateIso);
    navigate(`/trips?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dateStripDays.map((item) => {
              const isActive = item.iso === activeDateIso;
              return (
                <button
                  key={item.iso}
                  type="button"
                  onClick={() => handleDateChipClick(item.iso)}
                  className={`min-w-[86px] px-3 py-2 rounded-xl border text-center transition-all ${
                    isActive
                      ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#16a34a]/40 hover:text-[#16a34a]'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider">
                    {item.dayLabel}
                  </p>
                  <p className="text-lg font-black leading-tight">{item.dateLabel}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide">
                    {item.monthLabel}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <TripSearchForm
          from={searchData.from}
          to={searchData.to}
          date={searchData.date}
          onFromChange={(value) =>
            setSearchData((prev) => ({ ...prev, from: value }))
          }
          onToChange={(value) =>
            setSearchData((prev) => ({ ...prev, to: value }))
          }
          onDateChange={(value) =>
            setSearchData((prev) => ({ ...prev, date: value }))
          }
          onSwap={handleSwap}
          onSubmit={handleSearchSubmit}
        />


        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Sidebar (Desktop) */}
          <div className="hidden lg:block lg:col-span-3">
             <FilterSidebar 
                filters={filters} 
                setFilters={setFilters} 
                onReset={handleResetFilters}
                availableOperators={availableOperators}
                availableBoardingPoints={availableBoardingPoints}
                availableDroppingPoints={availableDroppingPoints}
             />
          </div>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Sorting & Stats Top Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowMobileFilters(true)}
                    className="lg:hidden btn btn-ghost btn-sm text-[#6b7280] gap-2 border-gray-100"
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
               
               <div className="flex bg-[#f9fafb] p-1.5 rounded-xl gap-2">
                  <button
                    onClick={() => setSortBy('departure')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${sortBy === 'departure' ? 'bg-white text-[#16a34a] shadow-sm' : 'text-[#6b7280] hover:text-[#111827]'}`}
                  >
                    Departure
                  </button>
                  <button 
                    onClick={() => setSortBy('cheapest')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${sortBy === 'cheapest' ? 'bg-white text-[#16a34a] shadow-sm' : 'text-[#6b7280] hover:text-[#111827]'}`}
                  >
                    Low to High
                  </button>
                  <button 
                    onClick={() => setSortBy('expensive')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${sortBy === 'expensive' ? 'bg-white text-[#16a34a] shadow-sm' : 'text-[#6b7280] hover:text-[#111827]'}`}
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
              <>
                <div className="grid gap-8">
                  {paginatedTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-sm font-semibold text-[#6b7280]">
                    Page <span className="text-[#111827]">{currentPage}</span> of{' '}
                    <span className="text-[#111827]">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-sm bg-white border-gray-200 text-[#111827] hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="btn btn-sm bg-white border-gray-200 text-[#111827] hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
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
                availableBoardingPoints={availableBoardingPoints}
                availableDroppingPoints={availableDroppingPoints}
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
