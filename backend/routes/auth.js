const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
require('dotenv').config();


// REGISTER
router.post('/register', [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { full_name, email, password, phone } = req.body;

        // Check if user exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (full_name, email, password, phone) VALUES (?, ?, ?, ?)',
            [full_name, email, hashedPassword, phone || null]
        );

        // Generate JWT
        const token = jwt.sign(
            { id: result.insertId, email, full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'lax'
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            token,
            user: {
                id: result.insertId,
                full_name,
                email
            }
        });

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// LOGIN
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, full_name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// GET USER PROFILE
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, full_name, email, phone, profile_pic, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get latest resume score
        const [resumes] = await pool.query(
            'SELECT resume_score FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1',
            [req.user.id]
        );

        // Get skill count
        const [skills] = await pool.query(
            'SELECT COUNT(*) as count FROM user_skills WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            user: users[0],
            resume_score: resumes.length > 0 ? resumes[0].resume_score : 0,
            skill_count: skills[0].count
        });

    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
});


// LOGOUT
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;