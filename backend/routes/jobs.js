const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
require('dotenv').config();

// SEARCH JOBS FROM ADZUNA
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { keyword, location, page } = req.query;

        // Get user skills if no keyword
        let searchKeyword = keyword;
        if (!searchKeyword) {
            const [skills] = await pool.query(
                'SELECT skill_name FROM user_skills WHERE user_id = ? LIMIT 5',
                [req.user.id]
            );
            searchKeyword = skills.map(s => s.skill_name).join(' ') || 'software developer';
        }

        const searchLocation = location || 'india';
        const pageNum = page || 1;

        // Determine country code from location
        let countryCode = 'in'; // default India
        const locationLower = searchLocation.toLowerCase();
        if (locationLower.includes('us') || locationLower.includes('united states') || locationLower.includes('america')) countryCode = 'us';
        else if (locationLower.includes('uk') || locationLower.includes('united kingdom') || locationLower.includes('england')) countryCode = 'gb';
        else if (locationLower.includes('canada')) countryCode = 'ca';
        else if (locationLower.includes('australia')) countryCode = 'au';
        else if (locationLower.includes('germany')) countryCode = 'de';

        const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${pageNum}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(searchKeyword)}&where=${encodeURIComponent(searchLocation)}&results_per_page=15&content-type=application/json`;

        const response = await axios.get(adzunaUrl);
        const jobs = response.data.results || [];

        const formattedJobs = jobs.map(job => ({
            title: job.title?.replace(/<[^>]*>/g, '') || 'N/A',
            company: job.company?.display_name || 'N/A',
            location: job.location?.display_name || 'N/A',
            description: job.description?.substring(0, 300) + '...' || '',
            salary_min: job.salary_min || null,
            salary_max: job.salary_max || null,
            url: job.redirect_url || '#',
            created: job.created,
            category: job.category?.label || 'N/A',
            contract_type: job.contract_type || 'N/A'
        }));

        res.json({
            success: true,
            total: response.data.count || 0,
            page: pageNum,
            jobs: formattedJobs
        });

    } catch (error) {
        console.error('Adzuna Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching jobs from Adzuna'
        });
    }
});

// SAVE A JOB
router.post('/save', authenticateToken, async (req, res) => {
    try {
        const { job_title, company, location, salary_min, salary_max, job_url } = req.body;

        await pool.query(
            'INSERT INTO saved_jobs (user_id, job_title, company, location, salary_min, salary_max, job_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, job_title, company, location, salary_min, salary_max, job_url]
        );

        res.json({
            success: true,
            message: 'Job saved successfully!'
        });

    } catch (error) {
        console.error('Save Job Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving job'
        });
    }
});

// GET SAVED JOBS
router.get('/saved', authenticateToken, async (req, res) => {
    try {
        const [jobs] = await pool.query(
            'SELECT * FROM saved_jobs WHERE user_id = ? ORDER BY saved_at DESC',
            [req.user.id]
        );

        res.json({ success: true, jobs });

    } catch (error) {
        console.error('Get Saved Jobs Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching saved jobs'
        });
    }
});

// DELETE SAVED JOB
router.delete('/saved/:jobId', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM saved_jobs WHERE id = ? AND user_id = ?',
            [req.params.jobId, req.user.id]
        );

        res.json({ success: true, message: 'Job removed' });

    } catch (error) {
        console.error('Delete Job Error:', error);
        res.status(500).json({ success: false, message: 'Error removing job' });
    }
});

module.exports = router;