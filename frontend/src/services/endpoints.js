/**
 * Relative API paths for the EasyTrip backend (same origin as `config.apiBaseUrl`).
 * Prefer these over string literals so renames stay centralized.
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  users: {
    me: '/users/me',
    changePassword: '/users/change-password',
    deleteAccount: '/users/delete-account',
    adminStats: '/users/admin/stats',
  },
  buses: {
    list: '/buses',
    update: (id) => `/buses/${id}`,
    delete: (id) => `/buses/${id}`,
    createSeats: (busId) => `/buses/${busId}/seats`,
  },
  routes: {
    list: '/routes',
    update: (id) => `/routes/${id}`,
    delete: (id) => `/routes/${id}`,
  },
  trips: {
    search: '/trips',
    details: (id) => `/trips/${id}`,
  },
  seats: {
    /** @returns {string} GET /buses/:busId/seats */
    byBus: (busId) => `/buses/${busId}/seats`,
  },
  bookings: {
    lock: '/bookings',
    confirm: '/bookings/confirm',
    details: (id) => `/bookings/${id}`,
    my: '/bookings/my-bookings',
    cancel: (id) => `/bookings/${id}/cancel`,
  },
  payments: {
    create: '/payments',
    sendConfirmationEmail: (bookingId) =>
      `/payments/${bookingId}/send-confirmation-email`,
  },
  refunds: {
    request: '/refunds',
  },
  operators: {
    list: '/admin/operators',
    details: (id) => `/admin/operators/${id}`,
    create: '/admin/operators',
    update: (id) => `/admin/operators/${id}`,
    suspend: (id) => `/admin/operators/${id}/suspend`,
    activate: (id) => `/admin/operators/${id}/activate`,
    stats: (id) => `/admin/operators/${id}/stats`,
  },
  operator: {
    stats: '/operator/dashboard/stats',
    buses: '/operator/buses',
    updateBus: (id) => `/operator/buses/${id}`,
    deleteBus: (id) => `/operator/buses/${id}`,
    routes: '/operator/routes',
    updateRoute: (id) => `/operator/routes/${id}`,
    deleteRoute: (id) => `/operator/routes/${id}`,
    trips: '/operator/trips',
    updateTrip: (id) => `/operator/trips/${id}`,
    cancelTrip: (id) => `/operator/trips/${id}/cancel`,
    bookings: '/operator/bookings',
    staff: '/operator/staff',
    createStaff: '/operator/staff',
    updateStaff: (id) => `/operator/staff/${id}`,
    deleteStaff: (id) => `/operator/staff/${id}`,
  },
  staff: {
    stats: '/staff/dashboard/stats',
    bookings: '/staff/bookings',
    createBooking: '/staff/bookings',
  },
  admin: {
    createBooking: '/admin/bookings',
    stats: '/admin/dashboard/stats',
    users: '/admin/users',
    changeUserRole: (id) => `/admin/users/${id}/role`,
    bookings: '/admin/bookings',
    cancelBooking: (id) => `/admin/bookings/${id}/cancel`,
    payments: '/admin/payments',
    refunds: '/admin/refunds',
    approveRefund: (id) => `/admin/refunds/${id}/approve`,
    rejectRefund: (id) => `/admin/refunds/${id}/reject`,
    syncSslRefund: (id) => `/admin/refunds/${id}/ssl-sync`,
    trips: '/admin/trips',
    updateTrip: (id) => `/admin/trips/${id}`,
    cancelTrip: (id) => `/admin/trips/${id}/cancel`,
    buses: '/admin/buses',
    updateBus: (id) => `/admin/buses/${id}`,
    deleteBus: (id) => `/admin/buses/${id}`,
    routes: '/admin/routes',
    updateRoute: (id) => `/admin/routes/${id}`,
    deleteRoute: (id) => `/admin/routes/${id}`,
    createSeats: (busId) => `/admin/buses/${busId}/seats`,
  },
};
