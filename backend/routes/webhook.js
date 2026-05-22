const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
require('dotenv').config();

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Simple webhook secret verification for external services (Make.com)
function verifyWebhookSecret(req, res, next) {
    const secret = req.headers['x-webhook-secret'] || req.query.secret;
    if (!process.env.WEBHOOK_SECRET) {
        // If no secret is configured, allow (for development)
        return next();
    }
    if (secret !== process.env.WEBHOOK_SECRET) {
        return res.status(403).json({ success: false, message: 'Invalid webhook secret' });
    }
    next();
}

// WEBHOOK FROM MAKE.COM (Receives Telegram data)
router.post('/make-webhook', verifyWebhookSecret, async (req, res) => {
    try {
        const { user_email, event_type, data } = req.body;

        if (event_type === 'send_results_email') {
            // Send email with results
            const mailOptions = {
                from: `"CareerPilot" <${process.env.EMAIL_USER}>`,
                to: user_email,
                subject: '🚀 Your CareerPilot Analysis Results',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: white; border-radius: 15px; overflow: hidden;">
                        <div style="padding: 30px; text-align: center;">
                            <h1 style="color: #a78bfa;">🚀 CareerPilot</h1>
                            <h2>Your Career Analysis Results</h2>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 25px; margin: 0 20px; border-radius: 10px;">
                            <h3 style="color: #818cf8;">📊 Resume Score: ${data.resume_score || 'N/A'}/100</h3>
                            <h3 style="color: #34d399;">🎯 Skills Found: ${data.skills_count || 0}</h3>
                            <p style="color: #e2e8f0;">${data.skills ? data.skills.join(', ') : 'No skills extracted'}</p>
                            ${data.career_title ? `<h3 style="color: #fbbf24;">💼 Best Career Match: ${data.career_title}</h3>` : ''}
                            ${data.missing_skills ? `<h3 style="color: #f87171;">📚 Skills to Learn:</h3><p style="color: #e2e8f0;">${data.missing_skills.join(', ')}</p>` : ''}
                        </div>
                        <div style="padding: 20px; text-align: center;">
                            <a href="${process.env.FRONTEND_URL}" style="background: linear-gradient(to right, #6366f1, #8b5cf6); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">View Full Dashboard</a>
                        </div>
                        <div style="padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
                            <p>CareerPilot - Your AI Career Guide</p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);

            // Log email
            const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [user_email]);
            if (users.length > 0) {
                await pool.query(
                    'INSERT INTO email_logs (user_id, email_type, status) VALUES (?, ?, ?)',
                    [users[0].id, 'resume_result', 'sent']
                );
            }
        }

        res.json({ success: true, message: 'Webhook processed' });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
});

// SEND EMAIL MANUALLY
router.post('/send-email', authenticateToken, async (req, res) => {
    try {
        const { to, subject, type, data } = req.body;

        let htmlContent = '';

        if (type === 'roadmap') {
            htmlContent = `
                <div style="font-family: Arial; max-width: 600px; margin: auto; background: #1a1a2e; color: white; border-radius: 15px; padding: 30px;">
                    <h1 style="color: #a78bfa; text-align: center;">🗺️ Your Career Roadmap</h1>
                    <h2 style="color: #818cf8;">Career: ${data.career_title}</h2>
                    <div style="margin-top: 20px;">
                        ${data.steps.map((step, i) => `
                            <div style="background: rgba(255,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #6366f1;">
                                <strong>Step ${i + 1}: ${step.title}</strong>
                                <p style="color: #94a3b8; margin: 5px 0 0 0;">${step.description || ''}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        await transporter.sendMail({
            from: `"CareerPilot" <${process.env.EMAIL_USER}>`,
            to,
            subject: subject || '🚀 CareerPilot Update',
            html: htmlContent
        });

        res.json({ success: true, message: 'Email sent!' });

    } catch (error) {
        console.error('Email Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
});

module.exports = router;