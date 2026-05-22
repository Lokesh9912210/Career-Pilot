const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const careerData = require('../data/careers.json');

// MATCH CAREERS BASED ON USER SKILLS
router.get('/careers', authenticateToken, async (req, res) => {
    try {
        // Get user skills from DB
        const [userSkills] = await pool.query(
            'SELECT skill_name FROM user_skills WHERE user_id = ?',
            [req.user.id]
        );

        if (userSkills.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No skills found. Please upload your resume first.'
            });
        }

        const skillNames = userSkills.map(s => s.skill_name);
        const userSkillsLower = skillNames.map(s => s.toLowerCase());
        const keyword = req.query.keyword ? req.query.keyword.toLowerCase() : null;

        // Filter by keyword if provided, otherwise match all
        let careersToMatch = careerData;
        if (keyword) {
            careersToMatch = careerData.filter(c =>
                c.career.toLowerCase().includes(keyword) ||
                c.domain.toLowerCase().includes(keyword) ||
                c.skills.some(s => s.includes(keyword))
            );
        }

        // Only clear UNSAVED career data
        const [unsaved] = await pool.query('SELECT id FROM onet_careers WHERE user_id = ? AND is_saved = FALSE', [req.user.id]);
        if (unsaved.length > 0) {
            const unsavedIds = unsaved.map(c => c.id);
            await pool.query('DELETE FROM roadmap_steps WHERE career_id IN (?)', [unsavedIds]);
            await pool.query('DELETE FROM onet_required_skills WHERE career_id IN (?)', [unsavedIds]);
            await pool.query('DELETE FROM onet_careers WHERE id IN (?)', [unsavedIds]);
        }

        const careerResults = [];

        for (const career of careersToMatch) {
            // Calculate skill match
            const matchingSkills = career.skills.filter(cs =>
                userSkillsLower.some(us => cs.includes(us) || us.includes(cs))
            );
            const missingSkills = career.skills.filter(cs =>
                !userSkillsLower.some(us => cs.includes(us) || us.includes(cs))
            );

            const matchScore = Math.round((matchingSkills.length / career.skills.length) * 100);
            const onetCode = `CP-${career.id}`;

            // Check if this career is already saved
            const [existing] = await pool.query('SELECT id, is_saved FROM onet_careers WHERE user_id = ? AND onet_code = ?', [req.user.id, onetCode]);
            
            let careerDbId = null;
            let isSaved = false;

            if (existing.length > 0) {
                // Update existing record
                careerDbId = existing[0].id;
                isSaved = existing[0].is_saved;
                await pool.query('UPDATE onet_careers SET match_score = ? WHERE id = ?', [matchScore, careerDbId]);
                await pool.query('DELETE FROM onet_required_skills WHERE career_id = ?', [careerDbId]); // Recreate req skills
            } else {
                // Save new unsaved career match to DB
                const [careerInsert] = await pool.query(
                    'INSERT INTO onet_careers (user_id, onet_code, career_title, match_score) VALUES (?, ?, ?, ?)',
                    [req.user.id, onetCode, career.career, matchScore]
                );
                careerDbId = careerInsert.insertId;
            }

            // Save required skills to DB
            for (const skill of career.skills) {
                const userHas = userSkillsLower.some(us => skill.includes(us) || us.includes(skill));
                await pool.query(
                    'INSERT INTO onet_required_skills (user_id, career_id, skill_name, importance_level, user_has) VALUES (?, ?, ?, ?, ?)',
                    [req.user.id, careerDbId, skill, 1, userHas]
                );
            }

            careerResults.push({
                id: careerDbId,
                onet_code: onetCode,
                title: career.career,
                domain: career.domain,
                match_score: matchScore,
                total_skills: career.skills.length,
                matching_skills: matchingSkills.length,
                missing_skills: missingSkills,
                is_saved: isSaved
            });
        }

        // Sort by match score descending
        careerResults.sort((a, b) => b.match_score - a.match_score);

        res.json({
            success: true,
            user_skills: skillNames,
            careers: careerResults
        });

    } catch (error) {
        console.error('Career Match Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error matching careers'
        });
    }
});

// GET SKILL GAP ANALYSIS
router.get('/skill-gap/:careerId', authenticateToken, async (req, res) => {
    try {
        const { careerId } = req.params;

        const [career] = await pool.query(
            'SELECT * FROM onet_careers WHERE id = ? AND user_id = ?',
            [careerId, req.user.id]
        );

        if (career.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Career not found'
            });
        }

        const [requiredSkills] = await pool.query(
            'SELECT * FROM onet_required_skills WHERE career_id = ? AND user_id = ?',
            [careerId, req.user.id]
        );

        const [userSkills] = await pool.query(
            'SELECT skill_name FROM user_skills WHERE user_id = ?',
            [req.user.id]
        );

        const hasSkills = requiredSkills.filter(s => s.user_has);
        const missingSkills = requiredSkills.filter(s => !s.user_has);

        res.json({
            success: true,
            career: career[0],
            analysis: {
                total_required: requiredSkills.length,
                skills_you_have: hasSkills.length,
                skills_to_learn: missingSkills.length,
                match_percentage: career[0].match_score,
                has_skills: hasSkills,
                missing_skills: missingSkills,
                user_skills: userSkills.map(s => s.skill_name)
            }
        });

    } catch (error) {
        console.error('Skill Gap Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error analyzing skill gap'
        });
    }
});

// GENERATE ROADMAP (from dataset)
router.post('/roadmap/:careerId', authenticateToken, async (req, res) => {
    try {
        const { careerId } = req.params;

        const [career] = await pool.query(
            'SELECT * FROM onet_careers WHERE id = ? AND user_id = ?',
            [careerId, req.user.id]
        );

        if (career.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Career not found'
            });
        }

        // Find the matching career in dataset to get roadmap steps
        const careerTitle = career[0].career_title;
        const datasetCareer = careerData.find(c =>
            c.career.toLowerCase() === careerTitle.toLowerCase()
        );

        if (!datasetCareer) {
            return res.status(404).json({
                success: false,
                message: 'Roadmap data not found for this career'
            });
        }

        // Clear old roadmap
        await pool.query(
            'DELETE FROM roadmap_steps WHERE career_id = ? AND user_id = ?',
            [careerId, req.user.id]
        );

        const roadmapSteps = [];

        // Create steps from the dataset roadmap
        for (let i = 0; i < datasetCareer.roadmap.length; i++) {
            const stepTitle = datasetCareer.roadmap[i];
            const targetDate = new Date(Date.now() + (i + 1) * 14 * 24 * 60 * 60 * 1000); // 2 weeks per step

            const [stepResult] = await pool.query(
                'INSERT INTO roadmap_steps (user_id, career_id, step_order, title, description, skill_to_learn, resource_link, target_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    req.user.id, careerId, i + 1,
                    stepTitle,
                    `Step ${i + 1} on your journey to becoming a ${careerTitle}`,
                    stepTitle,
                    `https://www.google.com/search?q=${encodeURIComponent(stepTitle + ' tutorial')}`,
                    targetDate
                ]
            );

            roadmapSteps.push({
                id: stepResult.insertId,
                step_order: i + 1,
                title: stepTitle,
                skill_to_learn: stepTitle,
                target_date: targetDate,
                is_completed: false
            });
        }

        res.json({
            success: true,
            message: 'Roadmap generated successfully!',
            career: careerTitle,
            roadmap: roadmapSteps
        });

    } catch (error) {
        console.error('Roadmap Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating roadmap'
        });
    }
});


// GET ROADMAP
router.get('/roadmap/:careerId', authenticateToken, async (req, res) => {
    try {
        const { careerId } = req.params;

        const [career] = await pool.query(
            'SELECT * FROM onet_careers WHERE id = ? AND user_id = ?',
            [careerId, req.user.id]
        );

        const [steps] = await pool.query(
            'SELECT * FROM roadmap_steps WHERE career_id = ? AND user_id = ? ORDER BY step_order',
            [careerId, req.user.id]
        );

        res.json({
            success: true,
            career: career[0],
            steps
        });

    } catch (error) {
        console.error('Get Roadmap Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching roadmap'
        });
    }
});

// UPDATE ROADMAP STEP (Mark Complete)
router.put('/roadmap/step/:stepId', authenticateToken, async (req, res) => {
    try {
        const { stepId } = req.params;
        const { is_completed } = req.body;

        await pool.query(
            'UPDATE roadmap_steps SET is_completed = ? WHERE id = ? AND user_id = ?',
            [is_completed, stepId, req.user.id]
        );

        res.json({
            success: true,
            message: 'Step updated successfully!'
        });

    } catch (error) {
        console.error('Update Step Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating step'
        });
    }
});

// GET ALL USER CAREERS (with saved status)
router.get('/my-careers', authenticateToken, async (req, res) => {
    try {
        const [careers] = await pool.query(
            'SELECT * FROM onet_careers WHERE user_id = ? ORDER BY match_score DESC',
            [req.user.id]
        );

        res.json({
            success: true,
            careers
        });

    } catch (error) {
        console.error('My Careers Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching careers' });
    }
});

// GET SAVED CAREERS ONLY (for roadmap page)
router.get('/saved-careers', authenticateToken, async (req, res) => {
    try {
        const [careers] = await pool.query(
            'SELECT * FROM onet_careers WHERE user_id = ? AND is_saved = TRUE ORDER BY match_score DESC',
            [req.user.id]
        );

        res.json({
            success: true,
            careers
        });

    } catch (error) {
        console.error('Saved Careers Error:', error);
        res.status(500).json({ success: false, message: 'Error fetching saved careers' });
    }
});

// SAVE / UNSAVE A CAREER PATH
router.put('/career/:careerId/save', authenticateToken, async (req, res) => {
    try {
        const { careerId } = req.params;
        const { is_saved } = req.body;

        await pool.query(
            'UPDATE onet_careers SET is_saved = ? WHERE id = ? AND user_id = ?',
            [is_saved, careerId, req.user.id]
        );

        res.json({
            success: true,
            message: is_saved ? 'Career path saved!' : 'Career path removed'
        });

    } catch (error) {
        console.error('Save Career Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving career'
        });
    }
});

// GET ALL AVAILABLE CAREERS (browse dataset)
router.get('/all-careers', async (req, res) => {
    res.json({
        success: true,
        careers: careerData.map(c => ({
            id: c.id,
            career: c.career,
            domain: c.domain,
            skills_count: c.skills.length,
            roadmap_steps: c.roadmap.length
        }))
    });
});

module.exports = router;
