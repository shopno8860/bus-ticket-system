import toast from 'react-hot-toast';

const buildToastId = (msg) =>
  `toast-${String(msg)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

const premiumToastClass = 'custom-toast custom-toast--rgb';
const errorToastClass = 'custom-toast custom-toast--error';

export const showSuccess = (msg, options = {}) =>
  toast.success(msg, {
    id: buildToastId(msg),
    className: premiumToastClass,
    ...options,
  });

export const showError = (msg, options = {}) =>
  toast.error(msg, {
    id: buildToastId(msg),
    className: errorToastClass,
    ...options,
  });

export const showLoading = (msg, options = {}) =>
  toast.loading(msg, {
    id: buildToastId(msg),
    ...options,
  });

export const showInfo = (msg, options = {}) =>
  toast(msg, {
    id: buildToastId(msg),
    className: premiumToastClass,
    ...options,
  });
