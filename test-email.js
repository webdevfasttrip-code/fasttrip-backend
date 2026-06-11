const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/"/g, ''),
    },
});

async function main() {
    try {
        let info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.EMAIL_USER,
            subject: "Test Email from Fasttrip (New Credentials)",
            text: "This is a test email.",
        });
        console.log("Message sent: %s", info.messageId);
    } catch (e) {
        console.error("Email error:", e);
    }
}

main();
