import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function createPayment(payload) {
  return apiFetch(endpoints.payments.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
