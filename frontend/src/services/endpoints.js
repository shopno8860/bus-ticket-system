export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  users: {
    me: '/users/me',
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
    byBus: (busId) => `/seats/bus/${busId}`,
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
  },
  refunds: {
    request: '/refunds',
  },
  admin: {
    stats: '/admin/dashboard/stats',
    users: '/admin/users',
    changeUserRole: (id) => `/admin/users/${id}/role`,
    bookings: '/admin/bookings',
    cancelBooking: (id) => `/admin/bookings/${id}/cancel`,
    payments: '/admin/payments',
    refunds: '/admin/refunds',
    approveRefund: (id) => `/admin/refunds/${id}/approve`,
    rejectRefund: (id) => `/admin/refunds/${id}/reject`,
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
