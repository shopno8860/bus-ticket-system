import { useEffect, useState } from 'react';
import { cancelAdminBooking, getAdminBookings } from '../services/adminApi';

function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await getAdminBookings();
      setBookings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const cancelBooking = async (bookingId) => {
    const reason = prompt('Enter cancellation reason');
    if (!reason) return;
    try {
      await cancelAdminBooking(bookingId, reason);
      await loadBookings();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  if (loading) return <div>Loading bookings...</div>;

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div key={booking.id} className="rounded border bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{booking.bookingReference}</div>
              <div className="text-sm text-gray-500">
                {booking.passengerName} • {booking.status}
              </div>
            </div>
            {booking.status !== 'CANCELLED' && (
              <button
                className="btn btn-sm btn-error text-white"
                onClick={() => cancelBooking(booking.id)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default BookingsPage;
