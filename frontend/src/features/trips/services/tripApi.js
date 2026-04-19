import { config } from '../../../config';

export const tripApi = {
  getTrips: async (from, to, date) => {
    const query = new URLSearchParams();
    
    // Mapping frontend fields to backend fields (origin, destination, date)
    if (from) query.append('origin', from);
    if (to) query.append('destination', to);
    if (date) query.append('date', date);

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
};
