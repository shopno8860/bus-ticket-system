import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function requestRefund(payload) {
  return apiFetch(endpoints.refunds.request, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
