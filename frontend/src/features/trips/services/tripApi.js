import { config } from '../../../config';

/**
 * Public trip search/detail using raw `fetch` (no auth). Maps UI filter names to backend query params.
 * @see GET /trips , GET /trips/:id
 */
export const tripApi = {
  /**
   * @param {string} [from] - origin city
   * @param {string} [to] - destination city
   * @param {string} [date] - ISO or display date string accepted by backend
   * @param {object} [filters] - busTypes, busClasses, boardingPoint, droppingPoint, minPrice, maxPrice
   * @returns {Promise<object[]>}
   */
  getTrips: async (from, to, date, filters = {}) => {
    const query = new URLSearchParams();

    if (from) query.append('origin', from);
    if (to) query.append('destination', to);
    if (date) query.append('date', date);
    if (filters.busTypes?.length) query.append('busType', filters.busTypes.join(','));
    if (filters.busClasses?.length) query.append('busClass', filters.busClasses.join(','));
    if (filters.boardingPoint) query.append('boardingPoint', filters.boardingPoint);
    if (filters.droppingPoint) query.append('droppingPoint', filters.droppingPoint);
    if (filters.minPrice !== '') query.append('minPrice', filters.minPrice);
    if (filters.maxPrice !== '') query.append('maxPrice', filters.maxPrice);

    const url = `${config.apiBaseUrl}/trips?${query.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trips: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data.trips || data.data || []);
  },

  /**
   * @param {string} tripId
   * @returns {Promise<object>} Trip with nested bus, route, seats
   */
  getTripDetails: async (tripId) => {
    const url = `${config.apiBaseUrl}/trips/${tripId}`;

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trip details: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * @param {string} routeId
   * @returns {Promise<{ boardingPoints: object[], droppingPoints: object[] }>}
   */
  getRoutePoints: async (routeId) => {
    const url = `${config.apiBaseUrl}/routes/${routeId}/points`;

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch route points: ${response.statusText}`);
    }

    return response.json();
  },
};
