const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// MIDDLEWARE
app.use(cors({
    origin: ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ROUTES

app.use('/api/auth', require('./routes/auth'));
app.use('/api/resume', require('./routes/resume'));
app.use('/api/onet', require('./routes/careers'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/webhook', require('./routes/webhook'));

// SERVE FRONTEND PAGE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

app.get('/upload-resume', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/resume.html'));
});

app.get('/my-roadmap', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/roadmap.html'));
});

app.get('/my-skills', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/skills.html'));
});

app.get('/find-jobs', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/jobs.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'CareerPilot API is running! 🚀' });
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 CareerPilot Server running on http://localhost:${PORT}`);
    console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend: http://localhost:${PORT}\n`);
});