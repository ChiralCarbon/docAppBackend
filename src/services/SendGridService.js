// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
const sgMail = require('@sendgrid/mail');
const config = require("config")
sgMail.setApiKey(config.get("sendGrid.API_KEY"));
const { logger } = require('../utils/logger')


class SendGridService {
    async sendBareEmail({ to, subject, text }) {
        try {
            const msg = {
                to,
                from: 'info@fandome.in', //Since we've only verified this domain
                subject,
                text
            };
            sgMail.send(msg);
        } catch (error) {
            logger.error({
                eventType: "sendBareEmail",
                error,
                payload: { to, subject, text }
            })
            return Promise.reject(error)
        }
    }
}

exports.SendGridService = new SendGridService()