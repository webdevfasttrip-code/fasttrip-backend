import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
    private razorpay: Razorpay;

    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }

    async createOrder(amount: number, receipt: string) {
        return this.razorpay.orders.create({
            amount: Math.round(amount * 100), // convert to paise and ensure integer
            currency: 'INR',
            receipt,
        });
    }

    verifyWebhookSignature(body: string, signature: string): boolean {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const hmac = crypto.createHmac('sha256', secret!);
        hmac.update(body);
        const expectedSignature = hmac.digest('hex');
        return expectedSignature === signature;
    }
}
