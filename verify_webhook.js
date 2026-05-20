const crypto = require('crypto');

async function verifyWebhook() {
    const BASE_URL = 'http://localhost:3000';
    const WEBHOOK_SECRET = 'razorpay_secret_123';

    try {
        console.log('--- 1. Fetching a Pending Booking ---');
        // We'll search and create a draft first to get a real one
        const searchRes = await fetch(`${BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin: 'DEL', destination: 'BOM', departureDate: '2026-03-25', adults: 1 })
        });
        const flights = await searchRes.json();
        const flight = flights[0];

        const draftRes = await fetch(`${BASE_URL}/booking/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'webhook-test@example.com',
                totalAmount: flight.fare.totalFare,
                contactPhone: '+910000000000',
                contactEmail: 'webhook-test@example.com',
                supplier: 'AMADEUS',
                rawOffer: flight.rawData,
                passengers: [{ firstName: 'Webhook', lastName: 'Test', gender: 'MALE', dateOfBirth: '1990-01-01' }]
            })
        });
        const draft = await draftRes.json();
        if (!draft.bookingRef) throw new Error('Draft creation failed: ' + JSON.stringify(draft));
        console.log('✅ Draft Created:', draft.bookingRef);

        console.log('\n--- 2. Initiating Payment (Generating Order ID) ---');
        const payRes = await fetch(`${BASE_URL}/booking/ref/${draft.bookingRef}/pay`, { method: 'POST' });
        const order = await payRes.json();
        console.log('✅ Order Created:', order.id);

        console.log('\n--- 3. Simulating Signed Webhook (payment.captured) ---');
        const payload = {
            event: 'payment.captured',
            payload: {
                payment: {
                    entity: {
                        id: 'pay_test_12345',
                        amount: flight.fare.totalFare * 100,
                        currency: 'INR',
                        order_id: order.id,
                        status: 'captured',
                        method: 'card',
                        notes: { bookingRef: draft.bookingRef }
                    }
                }
            }
        };

        const bodyString = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(bodyString)
            .digest('hex');

        const webhookRes = await fetch(`${BASE_URL}/payment/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-razorpay-signature': signature
            },
            body: bodyString
        });

        const webhookResult = await webhookRes.json();
        console.log('Webhook Response:', webhookRes.status, webhookResult);

        console.log('\n--- 4. Verifying Booking Status ---');
        const finalRes = await fetch(`${BASE_URL}/booking/ref/${draft.bookingRef}`);
        const finalBooking = await finalRes.json();

        if (finalBooking.bookingStatus === 'CONFIRMED' && finalBooking.paymentStatus === 'SUCCESS') {
            console.log('✅ SUCCESS: Booking confirmed via verified webhook!');
            console.log('Ticket Number:', finalBooking.ticketNumber);
            console.log('Payment ID:', finalBooking.paymentId);
        } else {
            console.log('❌ FAILURE: Status mismatch!', finalBooking.bookingStatus, finalBooking.paymentStatus);
        }

    } catch (error) {
        console.error('FAILURE:', error.message);
    }
}

verifyWebhook();
