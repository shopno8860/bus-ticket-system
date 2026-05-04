import { apiFetch } from '../../../services/api';
import { config } from '../../../config';
import { endpoints } from '../../../services/endpoints';

/**
 * POST /payments — start SSLCommerz session (Bearer required).
 * @param {object} payload - CreatePaymentDto (bookingId, …)
 */
export function createPayment(payload) {
  return apiFetch(endpoints.payments.create, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /payments/:bookingId/send-confirmation-email — multipart ticket PDF.
 * @param {string} bookingId
 * @param {File|Blob} ticketFile - Field name `ticketPdf` on the wire
 * @returns {Promise<{ message?: string }>}
 */
export async function sendConfirmationEmailWithTicket(bookingId, ticketFile) {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('ticketPdf', ticketFile);

  const response = await fetch(
    `${config.apiBaseUrl}${endpoints.payments.sendConfirmationEmail(bookingId)}`,
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to send confirmation email');
  }

  return response.json();
}
