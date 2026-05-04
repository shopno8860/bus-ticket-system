import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/**
 * POST /refunds — authenticated refund request.
 * @param {object} payload - RequestRefundDto (booking/payment identifiers, reason, …)
 */
export function requestRefund(payload) {
  return apiFetch(endpoints.refunds.request, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
