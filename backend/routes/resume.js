const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
require('dotenv').config();

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// SKILL KEYWORDS DATABASE
const SKILL_CATEGORIES = {
    programming: ['javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'typescript', 'scala', 'perl', 'r', 'matlab', 'dart', 'lua', 'haskell', 'assembly'],
    web: ['html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring boot', 'asp.net', 'next.js', 'nuxt.js', 'svelte', 'tailwind', 'bootstrap', 'sass', 'webpack', 'jquery', 'graphql', 'rest api', 'wordpress'],
    database: ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'sql server', 'firebase', 'dynamodb', 'cassandra', 'elasticsearch', 'neo4j', 'mariadb'],
    cloud: ['aws', 'azure', 'google cloud', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'heroku', 'digitalocean', 'cloudflare', 'nginx', 'apache'],
    data_science: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'data analysis', 'data visualization', 'tableau', 'power bi', 'statistics', 'nlp', 'computer vision', 'ai', 'artificial intelligence', 'big data', 'hadoop', 'spark', 'data mining'],
    mobile: ['android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic', 'swift', 'objective-c', 'kotlin'],
    tools: ['git', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'figma', 'photoshop', 'illustrator', 'vs code', 'intellij', 'postman', 'swagger'],
    soft_skills: ['communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking', 'time management', 'project management', 'agile', 'scrum', 'kanban', 'presentation']
};

// EXTRACT SKILLS FROM TEXT
function extractSkills(text) {
    const lowerText = text.toLowerCase();
    const foundSkills = [];

    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
        for (const skill of skills) {
            const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(lowerText)) {
                foundSkills.push({
                    name: skill.charAt(0).toUpperCase() + skill.slice(1),
                    category
                });
            }
        }
    }

    return foundSkills;
}

// CALCULATE RESUME SCORE

function calculateResumeScore(text, skills) {
    let score = 0;
    const lowerText = text.toLowerCase();

    // Skills count (max 30 points)
    score += Math.min(skills.length * 2, 30);

    // Contact info (max 10 points)
    if (/[\w.-]+@[\w.-]+\.\w+/.test(text)) score += 3;
    if (/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) score += 3;
    if (/linkedin\.com/i.test(text)) score += 2;
    if (/github\.com/i.test(text)) score += 2;

    // Sections (max 20 points)
    const sections = ['education', 'experience', 'work experience', 'projects', 'skills', 'certifications', 'achievements', 'summary', 'objective'];
    let sectionScore = 0;
    sections.forEach(s => {
        if (lowerText.includes(s)) sectionScore += 2.5;
    });
    score += Math.min(sectionScore, 20);

    // Experience keywords (max 15 points)
    const expKeywords = ['developed', 'managed', 'created', 'implemented', 'designed', 'led', 'built', 'achieved', 'improved', 'increased', 'reduced', 'optimized', 'collaborated', 'mentored', 'delivered'];
    let expScore = 0;
    expKeywords.forEach(k => {
        if (lowerText.includes(k)) expScore += 1;
    });
    score += Math.min(expScore, 15);

    // Length check (max 10 points)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 200 && wordCount <= 1000) score += 10;
    else if (wordCount >= 100) score += 5;

    // Education keywords (max 10 points)
    const eduKeywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college', 'b.tech', 'b.e', 'm.tech', 'mba', 'bsc', 'msc', 'diploma', 'certification'];
    let eduScore = 0;
    eduKeywords.forEach(k => {
        if (lowerText.includes(k)) eduScore += 2;
    });
    score += Math.min(eduScore, 10);

    // Quantifiable achievements (max 5 points)
    const numbers = text.match(/\d+%|\d+\+|\$\d+/g);
    if (numbers && numbers.length > 0) score += Math.min(numbers.length * 1, 5);

    return Math.min(Math.round(score), 100);
}

// UPLOAD RESUME
router.post('/upload', authenticateToken, upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please upload a PDF file.'
            });
        }

        // Parse PDF
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        const rawText = pdfData.text;

        // Extract skills
        const extractedSkills = extractSkills(rawText);

        // Calculate resume score
        const resumeScore = calculateResumeScore(rawText, extractedSkills);

        // Save resume to DB
        const [resumeResult] = await pool.query(
            'INSERT INTO resumes (user_id, file_name, file_path, raw_text, resume_score) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, req.file.originalname, req.file.path, rawText, resumeScore]
        );

        const resumeId = resumeResult.insertId;

        // Skip clearing old skills so we keep history


        // Save extracted skills
        for (const skill of extractedSkills) {
            await pool.query(
                'INSERT INTO user_skills (user_id, resume_id, skill_name, proficiency_level) VALUES (?, ?, ?, ?)',
                [req.user.id, resumeId, skill.name, 'intermediate']
            );
        }

        // Trigger Make.com webhook (Telegram bot integration)
        try {
            await axios.post(process.env.MAKE_WEBHOOK_URL, {
                event: 'resume_uploaded',
                user_id: req.user.id,
                user_email: req.user.email,
                user_name: req.user.full_name,
                resume_score: resumeScore,
                skills_count: extractedSkills.length,
                skills: extractedSkills.map(s => s.name),
                timestamp: new Date().toISOString()
            });
        } catch (webhookErr) {
            console.log('Make.com webhook not configured or failed:', webhookErr.message);
        }

        res.json({
            success: true,
            message: 'Resume uploaded and analyzed successfully!',
            data: {
                resume_id: resumeId,
                file_name: req.file.originalname,
                resume_score: resumeScore,
                skills_found: extractedSkills.length,
                skills: extractedSkills
            }
        });

    } catch (error) {
        console.error('Resume Upload Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing resume'
        });
    }
});

// GET USER SKILLS (grouped by resume)
router.get('/skills', authenticateToken, async (req, res) => {
    try {
        // Get the latest resume ID
        const [latestResume] = await pool.query(
            'SELECT id FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1',
            [req.user.id]
        );

        // Current skills (from latest resume)
        const [currentSkills] = await pool.query(
            `SELECT us.*, r.file_name, r.uploaded_at 
             FROM user_skills us 
             LEFT JOIN resumes r ON us.resume_id = r.id 
             WHERE us.user_id = ? AND us.resume_id = ?
             ORDER BY us.skill_name`,
            [req.user.id, latestResume.length > 0 ? latestResume[0].id : 0]
        );

        // Previous skills (from older resumes, deduplicated)
        const [previousSkills] = await pool.query(
            `SELECT us.skill_name, MAX(r.file_name) as file_name, MAX(r.uploaded_at) as uploaded_at 
             FROM user_skills us 
             LEFT JOIN resumes r ON us.resume_id = r.id 
             WHERE us.user_id = ? AND us.resume_id != ?
             GROUP BY us.skill_name
             ORDER BY us.skill_name`,
            [req.user.id, latestResume.length > 0 ? latestResume[0].id : 0]
        );

        // All unique skills (for career matching)
        const [allSkills] = await pool.query(
            'SELECT DISTINCT skill_name FROM user_skills WHERE user_id = ? ORDER BY skill_name',
            [req.user.id]
        );

        res.json({
            success: true,
            skills: allSkills,
            current_skills: currentSkills,
            previous_skills: previousSkills,
            latest_resume: latestResume.length > 0 ? latestResume[0].id : null
        });

    } catch (error) {
        console.error('Get Skills Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching skills'
        });
    }
});

// GET RESUME HISTORY
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const [resumes] = await pool.query(
            'SELECT id, file_name, resume_score, uploaded_at FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC',
            [req.user.id]
        );

        res.json({
            success: true,
            resumes
        });

    } catch (error) {
        console.error('Resume History Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching resume history'
        });
    }
});

// DELETE RESUME FROM HISTORY
router.delete('/history/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Get resume info for file deletion
        const [resume] = await pool.query(
            'SELECT * FROM resumes WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (resume.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found'
            });
        }

        // Delete associated skills
        await pool.query('DELETE FROM user_skills WHERE resume_id = ? AND user_id = ?', [id, req.user.id]);

        // Delete resume record
        await pool.query('DELETE FROM resumes WHERE id = ? AND user_id = ?', [id, req.user.id]);

        // Delete file from disk
        try {
            if (resume[0].file_path && fs.existsSync(resume[0].file_path)) {
                fs.unlinkSync(resume[0].file_path);
            }
        } catch (fileErr) {
            console.log('Could not delete file:', fileErr.message);
        }

        res.json({
            success: true,
            message: 'Resume deleted successfully'
        });

    } catch (error) {
        console.error('Delete Resume Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting resume'
        });
    }
});

module.exports = router;