import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendETicketEmail(to: string, bookingRef: string, name: string, pnr: string) {
    const htmlContent = `
      <div style="font-family: sans-serif; max-w-[600px]; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
        <div style="background-color: #6A39E0; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
             <h1 style="color: white; margin: 0;">FastTrip</h1>
        </div>
        <div style="padding: 20px;">
             <h2>Booking Confirmed!</h2>
             <p>Hi ${name},</p>
             <p>Your booking <strong>${bookingRef}</strong> has been confirmed securely.</p>
             <div style="background-color: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <h3 style="margin-top: 0; color: #6A39E0;">E-Ticket Details</h3>
                 <p><strong>Airline PNR:</strong> ${pnr}</p>
             </div>
             <p>Log in to your account at FastTrip to download the official PDF E-Ticket or manage your itinerary.</p>
             <p>Happy Travels,<br>The FastTrip Team</p>
        </div>
      </div>
    `;

    try {
        const info = await this.transporter.sendMail({
          from: `"FastTrip Support" <${process.env.SMTP_USER || 'noreply@fasttrip.com'}>`, // sender address
          to, // list of receivers
          subject: `FastTrip E-Ticket Confirmed | PNR: ${pnr}`, // Subject line
          html: htmlContent, // html body
        });
        this.logger.log(`E-Ticket sent: ${info.messageId} to ${to}`);
    } catch(err) {
        this.logger.error(`Error sending E-Ticket to ${to}: ${err.message}`);
    }
  }
}
