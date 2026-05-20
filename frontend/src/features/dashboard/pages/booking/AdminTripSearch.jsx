import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../../../hooks/useFetch';
import { apiFetch } from '../../../../services/api';
import { endpoints } from '../../../../services/endpoints';

const BUS_TYPES = ['AC', 'NON_AC', 'SLEEPER'];
const BUS_CLASSES = ['BUSINESS', 'ECONOMY'];

function AdminTripSearch() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: '',
    busType: '',
    busClass: '',
  });

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const { data: routeData } = useFetch(
    useCallback(
      () => apiFetch(endpoints.dashboard.bookingRoutes).then((res) => res.items ?? res),
      [],
    ),
  );
  const routes = Array.isArray(routeData) ? routeData : [];

  const uniqueOrigins = [...new Set(routes.map((r) => r.origin))].sort();
  const uniqueDestinations = [...new Set(routes.map((r) => r.destination))].sort();

  const handleSearch = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const query = new URLSearchParams();
      if (searchParams.origin) query.append('origin', searchParams.origin);
      if (searchParams.destination) query.append('destination', searchParams.destination);
      if (searchParams.date) query.append('date', searchParams.date);
      if (searchParams.busType) query.append('busType', searchParams.busType);
      if (searchParams.busClass) query.append('busClass', searchParams.busClass);

      const data = await apiFetch(`${endpoints.dashboard.tripsSearch}?${query.toString()}`);
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to search trips');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrip = (trip) => {
    navigate(`/dashboard/booking/seats/${trip.id}`, {
      state: { trip },
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 bg-slate-50 p-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Book Ticket for Passenger</h1>
          <p className="text-sm text-slate-500">Search and select a trip to book on behalf of a passenger</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FilterField label="Origin">
              <select
                value={searchParams.origin}
                onChange={(e) => setSearchParams((p) => ({ ...p, origin: e.target.value }))}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All origins</option>
                {uniqueOrigins.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Destination">
              <select
                value={searchParams.destination}
                onChange={(e) => setSearchParams((p) => ({ ...p, destination: e.target.value }))}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All destinations</option>
                {uniqueDestinations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Travel Date">
              <input
                type="date"
                value={searchParams.date}
                onChange={(e) => setSearchParams((p) => ({ ...p, date: e.target.value }))}
                min={today}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </FilterField>

            <FilterField label="Bus Type">
              <select
                value={searchParams.busType}
                onChange={(e) => setSearchParams((p) => ({ ...p, busType: e.target.value }))}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All types</option>
                {BUS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Bus Class">
              <select
                value={searchParams.busClass}
                onChange={(e) => setSearchParams((p) => ({ ...p, busClass: e.target.value }))}
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All classes</option>
                {BUS_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FilterField>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-[#0f172a] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1e293b] disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'Search Trips'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin text-slate-500">
              <circle cx="12" cy="12" r="10" className="stroke-current opacity-25" strokeWidth="4" fill="none" />
              <path className="fill-current opacity-90" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
            </svg>
          </div>
        ) : error ? (
          <div className="m-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : !searched ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            Use the filters above to search for available trips
          </div>
        ) : trips.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No trips found matching your criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Bus</th>
                  <th className="px-3 py-2 font-medium">Route</th>
                  <th className="px-3 py-2 font-medium">Departure</th>
                  <th className="px-3 py-2 font-medium">Arrival</th>
                  <th className="px-3 py-2 font-medium">Type/Class</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Seats Left</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{trip.bus?.name ?? '-'}</p>
                      <p className="text-xs text-slate-500">{trip.bus?.operatorName ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {trip.route?.origin ?? '-'} {'->'} {trip.route?.destination ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(trip.departureTime)}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(trip.arrivalTime)}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-600">{trip.bus?.busType ?? '-'}</span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="text-xs text-slate-600">{trip.bus?.busClass ?? '-'}</span>
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{formatPrice(trip.price)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium ${Number(trip.availableSeats) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trip.availableSeats ?? '?'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleSelectTrip(trip)}
                        disabled={Number(trip.availableSeats) <= 0}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Select Seats
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '-';
  return `\u09F3 ${amount.toLocaleString('en-BD')}`;
}

export default AdminTripSearch;
