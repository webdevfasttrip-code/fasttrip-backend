import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '465', 10),
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendETicketEmail(to: string, pnr: string, pdfHtmlContent: string, emailHtmlContent: string) {
    const adminEmail = process.env.EMAIL_USER || 'fasttrip.in@gmail.com';

    try {
        let pdfBuffer: Buffer;
        try {
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(pdfHtmlContent, { waitUntil: 'load', timeout: 10000 });
            const uint8ArrayPdf = await page.pdf({ format: 'A4', printBackground: true });
            pdfBuffer = Buffer.from(uint8ArrayPdf);
            await browser.close();
        } catch (pdfErr) {
            this.logger.error(`Failed to generate PDF for ${pnr}: ${pdfErr.message}`);
            // Fallback to sending HTML as attachment if PDF fails
            pdfBuffer = Buffer.from(pdfHtmlContent, 'utf-8');
        }

        const info = await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || `"FastTrip Support" <${adminEmail}>`,
          to, // Customer's email
          cc: adminEmail, // CC to our own email address for record keeping
          subject: `Ticket Confirmation - Fast Trip | PNR: ${pnr}`, // Subject line
          html: emailHtmlContent, // Full E-Ticket HTML as the email body!
          attachments: [
            {
                filename: `Ticket-${pnr}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
          ]
        });
        this.logger.log(`E-Ticket sent: ${info.messageId} to ${to} and CC to ${adminEmail}`);
    } catch(err) {
        this.logger.error(`Error sending E-Ticket to ${to}: ${err.message}`);
    }
  }
}
