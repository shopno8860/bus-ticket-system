import toast from 'react-hot-toast';

/** Styled wrappers around `react-hot-toast` with de-duplicated ids. */

const buildToastId = (msg) =>
  `toast-${String(msg)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

const premiumToastClass = 'custom-toast custom-toast--rgb';
const errorToastClass = 'custom-toast custom-toast--error';

/** @param {string} msg */
export const showSuccess = (msg, options = {}) =>
  toast.success(msg, {
    id: buildToastId(msg),
    className: premiumToastClass,
    ...options,
  });

/** @param {string} msg */
export const showError = (msg, options = {}) =>
  toast.error(msg, {
    id: buildToastId(msg),
    className: errorToastClass,
    ...options,
  });

/** @returns {string} toast id for later `dismissToast` */
export const showLoading = (msg, options = {}) =>
  toast.loading(msg, {
    id: buildToastId(msg),
    ...options,
  });

/** @param {string} msg */
export const showInfo = (msg, options = {}) =>
  toast(msg, {
    id: buildToastId(msg),
    className: premiumToastClass,
    ...options,
  });

/** Dismiss a toast by the id returned from loading/success helpers. */
export const dismissToast = (toastId) => {
  if (toastId != null) toast.dismiss(toastId);
};
