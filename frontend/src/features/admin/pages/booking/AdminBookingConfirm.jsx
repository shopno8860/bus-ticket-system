import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Ticket from '../../../../components/ticket/Ticket';
import { downloadPDF } from '../../../../utils/pdf';

function AdminBookingConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const ticketRef = useRef(null);

  if (!state?.booking) {
    return (
      <div className="flex items-center justify-center bg-slate-50 p-12">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No booking data found.</p>
          <button onClick={() => navigate('/admin/booking')} className="rounded-md bg-[#0f172a] px-4 py-2 text-sm font-medium text-white">
            Book Another Ticket
          </button>
        </div>
      </div>
    );
  }

  const { booking } = state;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      await downloadPDF('ticket', `Ticket-${booking.bookingReference}.pdf`);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 print:bg-white print:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-100 p-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Booking Confirmed</h1>
              <p className="text-sm text-slate-500">Reference: {booking.bookingReference}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Print Ticket
          </button>
          <button
            onClick={handleDownloadPDF}
            className="rounded-md bg-[#0f172a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1e293b]"
          >
            Download PDF
          </button>
          <button
            onClick={() => navigate('/admin/booking')}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Book Another
          </button>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto">
        <Ticket booking={booking} ticketRef={ticketRef} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background-color: white !important; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .max-w-\\[1000px\\] { max-width: 100% !important; margin: 0 !important; }
          .bg-slate-50 { background: white !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}} />
    </div>
  );
}

export default AdminBookingConfirm;
