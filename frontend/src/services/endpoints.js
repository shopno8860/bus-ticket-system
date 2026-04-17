export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
  },
  users: {
    me: '/users/me',
    adminStats: '/users/admin/stats',
  },
  buses: {
    list: '/buses',
  },
  routes: {
    list: '/routes',
  },
  trips: {
    search: '/trips',
  },
  seats: {
    byBus: (busId) => `/seats/bus/${busId}`,
  },
  bookings: {
    lock: '/bookings',
    confirm: '/bookings/confirm',
  },
  payments: {
    create: '/payments',
  },
  refunds: {
    request: '/refunds',
  },
};
