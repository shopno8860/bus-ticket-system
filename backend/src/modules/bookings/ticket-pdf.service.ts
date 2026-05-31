import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class TicketPdfService {
  constructor(private readonly prismaService: PrismaService) {}

  async generateBookingTicketPdf(bookingId: string): Promise<Buffer> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        trip: {
          include: {
            route: true,
            bus: {
              include: {
                operator: {
                  select: { companyName: true },
                },
              },
            },
          },
        },
        bookingSeats: {
          include: {
            seat: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            transactionId: true,
            status: true,
            method: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found for ticket generation');
    }

    const bookingReference = booking.bookingReference ?? 'N/A';
    const busOperator =
      booking.trip.bus.operator?.companyName ?? 'Bus Operator';
    const busName = booking.trip.bus.name ?? 'N/A';
    const busType = booking.trip.bus.busType ?? 'N/A';
    const coach = booking.trip.bus.registrationNumber ?? 'N/A';
    const routeFrom = booking.trip.route.origin ?? 'N/A';
    const routeTo = booking.trip.route.destination ?? 'N/A';
    const passengerName = booking.passengerName ?? 'N/A';
    const contact = booking.passengerPhone ?? 'Contact Support';
    const txn = booking.payments[0]?.transactionId ?? 'N/A';
    const paymentMethod = booking.payments[0]?.method ?? 'N/A';
    const paymentStatus = booking.payments[0]?.status ?? 'PAID';
    const isStaffIssued =
      booking.bookingSource === 'ADMIN_BOOKING' ||
      booking.bookingSource === 'STAFF_BOOKING' ||
      booking.bookingSource === 'MANUAL';

    const seatNumbers = booking.bookingSeats
      .map((entry) => entry.seat.seatNumber)
      .sort((a, b) => a.localeCompare(b))
      .join(', ');

    const departureDate = new Date(booking.trip.departureTime);
    const departure = departureDate.toLocaleString();
    const journeyDate = departureDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const journeyTime = departureDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const seatCount = booking.bookingSeats.length;
    const seatPrice = Number(booking.trip.price ?? 0);
    const seatTotal = seatCount * seatPrice;
    const totalPayable = Number(
      (isStaffIssued
        ? booking.finalAmount ?? booking.totalAmount
        : booking.totalAmount) ?? seatTotal,
    );

    const drawKeyValue = (
      doc: any,
      label: string,
      value: string,
      y: number,
      x = 55,
      width = 500,
    ) => {
      doc.fontSize(9).fillColor('#6b7280').text(label, x, y, { width });
      doc
        .fontSize(12)
        .fillColor('#111827')
        .text(value, x, y + 12, { width });
    };

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header (Ticket.jsx inspired)
      doc
        .roundedRect(50, 45, 495, 90, 8)
        .lineWidth(1)
        .strokeColor('#e5e7eb')
        .stroke();
      doc.fontSize(22).fillColor('#111827').text(busOperator, 65, 62);
      doc
        .fontSize(12)
        .fillColor('#6b7280')
        .text(`${busName} (${busType})`, 65, 92);
      doc.fontSize(11).fillColor('#111827').text(contact, 65, 110);
      doc
        .fontSize(11)
        .fillColor('#111827')
        .text(`PNR: ${bookingReference}`, 390, 80, {
          width: 140,
          align: 'right',
        });

      // Left/Middle information blocks
      doc
        .roundedRect(50, 150, 240, 205, 8)
        .lineWidth(1)
        .strokeColor('#e5e7eb')
        .stroke();
      drawKeyValue(doc, 'FROM', routeFrom, 165, 65, 210);
      drawKeyValue(doc, 'TO', routeTo, 205, 65, 210);
      drawKeyValue(doc, 'BOARDING POINT', routeFrom, 245, 65, 210);
      drawKeyValue(
        doc,
        'DEPARTURE TIME',
        `${journeyDate}  ${journeyTime}`,
        285,
        65,
        210,
      );

      doc
        .roundedRect(305, 150, 240, 205, 8)
        .lineWidth(1)
        .strokeColor('#e5e7eb')
        .stroke();
      drawKeyValue(doc, 'JOURNEY DATE', journeyDate, 165, 320, 210);
      drawKeyValue(doc, 'BUS OPERATOR', busOperator, 205, 320, 210);
      drawKeyValue(doc, 'BUS TYPE', busType, 245, 320, 210);
      drawKeyValue(doc, 'COACH', coach, 285, 320, 210);
      drawKeyValue(doc, 'BOOKED BY', passengerName, 325, 320, 210);

      // Price details block
      doc
        .roundedRect(50, 370, 495, 110, 8)
        .lineWidth(1)
        .fillAndStroke('#eff6ff', '#dbeafe');
      doc.fontSize(12).fillColor('#166534').text('PRICE DETAILS', 65, 386);
      doc
        .fontSize(11)
        .fillColor('#111827')
        .text(`Seat Total (${seatCount} × BDT ${seatPrice})`, 65, 410)
        .text(`BDT ${seatTotal}`, 450, 410, { width: 80, align: 'right' });

      if (!isStaffIssued) {
        const platformFeePerSeat =
          booking.trip.bus.busType === 'NON_AC' ? 40 : 70;
        const insurancePerSeat = 10;
        const platformFee = seatCount * platformFeePerSeat;
        const insuranceFee = seatCount * insurancePerSeat;

        doc
          .text(
            `Platform Fee (${seatCount} × BDT ${platformFeePerSeat})`,
            65,
            427,
          )
          .text(`BDT ${platformFee}`, 450, 427, { width: 80, align: 'right' })
          .text(`Insurance (${seatCount} × BDT ${insurancePerSeat})`, 65, 444)
          .text(`BDT ${insuranceFee}`, 450, 444, { width: 80, align: 'right' });
        doc.moveTo(65, 461).lineTo(530, 461).strokeColor('#93c5fd').stroke();
      } else {
        doc.moveTo(65, 435).lineTo(530, 435).strokeColor('#93c5fd').stroke();
      }
      doc
        .fontSize(12)
        .fillColor('#166534')
        .text('Total Payable', 65, 466)
        .text(`BDT ${totalPayable}`, 430, 466, { width: 100, align: 'right' });

      // Passenger + payment block
      doc
        .roundedRect(50, 495, 495, 82, 8)
        .lineWidth(1)
        .strokeColor('#e5e7eb')
        .stroke();
      drawKeyValue(doc, 'PASSENGER', passengerName, 508, 65, 120);
      drawKeyValue(doc, 'SEAT', seatNumbers || 'N/A', 508, 190, 130);
      drawKeyValue(doc, 'STATUS', booking.status, 508, 330, 90);
      drawKeyValue(doc, 'TRANSACTION', txn, 508, 420, 110);

      // Terms + payment info
      doc.fontSize(10).fillColor('#111827').text('TERMS & CONDITIONS', 50, 595);
      doc
        .fontSize(9)
        .fillColor('#4b5563')
        .text('• Arrive at least 30 minutes before departure', 50, 611)
        .text('• Carry a valid ID during travel', 50, 625)
        .text('• Schedule can change due to traffic/weather', 50, 639);

      doc.fontSize(10).fillColor('#111827').text('PAYMENT INFO', 330, 595);
      doc
        .fontSize(9)
        .fillColor('#4b5563')
        .text(`Method: ${paymentMethod}`, 330, 611)
        .text(`Transaction: ${txn}`, 330, 625)
        .text(`Status: ${paymentStatus}`, 330, 639)
        .text(`Issued: ${departure}`, 330, 653);

      doc
        .fontSize(10)
        .fillColor('#166534')
        .text(`Thank you for traveling with ${busOperator}`, 50, 685, {
          width: 495,
          align: 'center',
        });

      doc.end();
    });
  }
}
