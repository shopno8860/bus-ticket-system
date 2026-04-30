import toast from 'react-hot-toast';

const buildToastId = (msg) =>
  `toast-${String(msg)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

export const showSuccess = (msg, options = {}) =>
  toast.success(msg, {
    id: buildToastId(msg),
    ...options,
  });

export const showError = (msg, options = {}) =>
  toast.error(msg, {
    id: buildToastId(msg),
    ...options,
  });

export const showLoading = (msg, options = {}) =>
  toast.loading(msg, {
    id: buildToastId(msg),
    ...options,
  });
