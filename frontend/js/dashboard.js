async function loadDashboard() {
    if (!requireAuth()) return;

    setupSidebarUser();

    try {
        // Load profile
        const profileRes = await apiFetch(`${API_BASE}/auth/profile`);
        const profileData = await profileRes.json();

        if (profileData.success) {
            const score = profileData.resume_score || 0;
            const scoreEl = document.getElementById('statResumeScore');
            const skillEl = document.getElementById('statSkillCount');
            if (scoreEl) scoreEl.textContent = `${score}/100`;
            if (skillEl) skillEl.textContent = profileData.skill_count || 0;

            // Animate score circle
            animateScore(score);
            const scoreNum = document.getElementById('scoreNumber');
            if (scoreNum) scoreNum.textContent = score;
        }

        // Load careers count
        const careersRes = await apiFetch(`${API_BASE}/onet/my-careers`);
        const careersData = await careersRes.json();
        if (careersData.success) {
            const careersEl = document.getElementById('statCareers');
            if (careersEl) careersEl.textContent = careersData.careers.length;

            // Show career matches
            const careersDiv = document.getElementById('dashboardCareers');
            if (careersData.careers.length > 0 && careersDiv) {
                const careersHtml = careersData.careers.slice(0, 3).map(c => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm);margin-bottom:8px;">
                            <div style="font-weight:600;">${escapeHtml(c.career_title)}</div>
                        <span class="badge badge-purple">${c.match_score}% match</span>
                    </div>
                `).join('');
                careersDiv.innerHTML = careersHtml;
            }
        }

        // Load saved jobs count
        const jobsRes = await apiFetch(`${API_BASE}/jobs/saved`);
        const jobsData = await jobsRes.json();
        if (jobsData.success) {
            const jobsEl = document.getElementById('statSavedJobs');
            if (jobsEl) jobsEl.textContent = jobsData.jobs.length;
        }

        // Load skills
        const skillsRes = await apiFetch(`${API_BASE}/resume/skills`);
        const skillsData = await skillsRes.json();
        if (skillsData.success && skillsData.skills.length > 0) {
            const skillsDiv = document.getElementById('dashboardSkills');
            if (skillsDiv) {
                const skillsHtml = skillsData.skills.slice(0, 15).map(s =>
                    `<span class="skill-tag neutral">${escapeHtml(s.skill_name)}</span>`
                ).join('');
                skillsDiv.innerHTML = skillsHtml;
            }
        }

    } catch (err) {
        console.error('Dashboard load error:', err);
    }

    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.classList.add('hide');
    }, 800);
}

function animateScore(score) {
    const circle = document.getElementById('scoreCircle');
    if (!circle) return;

    const circumference = 2 * Math.PI * 90; // r=90
    const offset = circumference - (score / 100) * circumference;

    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
    }, 500);
}

// Init
document.addEventListener('DOMContentLoaded', loadDashboard);