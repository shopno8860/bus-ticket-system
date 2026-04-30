import { config } from '../../../config';

export const tripApi = {
  getTrips: async (from, to, date, filters = {}) => {
    const query = new URLSearchParams();
    
    // Mapping frontend fields to backend fields (origin, destination, date)
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
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trips: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data.trips || data.data || []);
  },

  getTripDetails: async (tripId) => {
    const url = `${config.apiBaseUrl}/trips/${tripId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trip details: ${response.statusText}`);
    }

    return response.json();
  },
};
