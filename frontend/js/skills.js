
let selectedCareerId = null;

async function loadMySkills() {
    try {
        const res = await apiFetch(`${API_BASE}/resume/skills`);
        const data = await res.json();

        if (data.success) {
            const badgeEl = document.getElementById('totalSkillBadge');
            if (badgeEl) badgeEl.textContent = `${data.skills.length} skills`;

            // Current skills (from latest resume)
            const currentDiv = document.getElementById('mySkills');
            if (currentDiv) {
                if (data.current_skills && data.current_skills.length > 0) {
                    currentDiv.innerHTML = data.current_skills.map(s =>
                        `<span class="skill-tag has">${escapeHtml(s.skill_name)}</span>`
                    ).join('');
                } else {
                    currentDiv.innerHTML = '<span style="color:var(--text-muted);">No skills found. Upload your resume first!</span>';
                }
            }

            // Previous skills (from older resumes)
            const prevDiv = document.getElementById('previousSkills');
            if (prevDiv && data.previous_skills && data.previous_skills.length > 0) {
                const prevSection = document.getElementById('previousSkillsSection');
                if (prevSection) prevSection.style.display = 'block';

                // Filter out skills that are already in current
                const currentNames = (data.current_skills || []).map(s => s.skill_name.toLowerCase());
                const uniquePrev = data.previous_skills.filter(s =>
                    !currentNames.includes(s.skill_name.toLowerCase())
                );

                if (uniquePrev.length > 0) {
                    prevDiv.innerHTML = uniquePrev.map(s =>
                        `<span class="skill-tag neutral">${escapeHtml(s.skill_name)}</span>`
                    ).join('');
                } else {
                    const prevSection = document.getElementById('previousSkillsSection');
                    if (prevSection) prevSection.style.display = 'none';
                }
            }
        }
    } catch (err) {
        console.error('Load skills error:', err);
    }
}

function createCareerCardHtml(c, isSavedView = false) {
    const btnClass = c.is_saved ? 'btn-primary' : 'btn-success';
    const btnText = c.is_saved ? '✅ Saved' : '⭐ Save';
    
    // For saved careers, we don't know the exact matching length unless we fetch skill gap,
    // so we skip the exact "matching" count if not available, or just render lightly.
    const matchScoreStr = c.match_score !== undefined ? `<span class="badge ${c.match_score >= 50 ? 'badge-emerald' : 'badge-amber'}">${c.match_score}% match</span>` : '';
    
    let skillsInfo = '';
    if (c.matching_skills !== undefined && c.missing_skills !== undefined) {
        skillsInfo = `
            <div style="display:flex;gap:16px;font-size:0.85rem;">
                <span style="color:var(--accent-emerald);">✅ ${c.matching_skills} matching</span>
                <span style="color:var(--accent-rose);">❌ ${c.missing_skills.length} missing</span>
            </div>
        `;
    }

    return `
        <div class="glass-card" id="career-card-${c.id}" style="margin-bottom:15px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <h4>${escapeHtml(c.title || c.career_title)}</h4>
                ${matchScoreStr}
            </div>
            ${c.domain ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">📁 ${escapeHtml(c.domain)}</div>` : ''}
            ${skillsInfo}
            ${c.match_score !== undefined ? `
            <div class="progress-bar" style="margin-top:10px;">
                <div class="progress-fill" style="width:${c.match_score}%;"></div>
            </div>` : ''}
            <div style="display:flex;gap:8px;margin-top:12px;">
                <button class="btn btn-sm btn-secondary" onclick="analyzeSkillGap(${c.id})" style="flex:1;">🎯 Skill Gap</button>
                <button class="btn btn-sm ${btnClass}" id="save-btn-${c.id}-${isSavedView?'saved':'search'}" onclick="toggleSaveCareer(${c.id}, ${!c.is_saved})">${btnText}</button>
            </div>
        </div>
    `;
}
// LOAD SAVED CAREERS
async function loadSavedCareers() {
    try {
        const res = await apiFetch(`${API_BASE}/onet/saved-careers`);
        const data = await res.json();
        
        const listEl = document.getElementById('savedCareersList');
        if (!listEl) return;

        if (data.success && data.careers.length > 0) {
            // Map the data slightly as /saved-careers returns DB row format
            const html = data.careers.map(c => {
                c.is_saved = true;
                return createCareerCardHtml(c, true);
            }).join('');
            listEl.innerHTML = html;
        } else {
            listEl.innerHTML = '<div class="empty-state"><p>No saved careers yet. Search below to find some!</p></div>';
        }
    } catch (err) {
        console.error('Error loading saved careers:', err);
    }
}

// SEARCH CAREERS
async function searchCareers() {
    const searchEl = document.getElementById('careerSearch');
    const keyword = searchEl ? searchEl.value.trim() : '';

    showToast('Searching for career matches...', 'info');

    try {
        const url = keyword
            ? `${API_BASE}/onet/careers?keyword=${encodeURIComponent(keyword)}`
            : `${API_BASE}/onet/careers`;

        const res = await apiFetch(url);
        const data = await res.json();

        if (data.success) {
            const resultsEl = document.getElementById('careerResults');
            if (resultsEl) resultsEl.style.display = 'block';

            const listEl = document.getElementById('careersList');
            if (data.careers.length > 0 && listEl) {
                const html = data.careers.map(c => createCareerCardHtml(c, false)).join('');
                listEl.innerHTML = html;
                showToast(`Found ${data.careers.length} career matches!`, 'success');
            } else if (listEl) {
                listEl.innerHTML = '<div class="empty-state"><p>No careers found. Try different keywords.</p></div>';
            }
        } else {
            showToast(data.message || 'Error searching careers', 'error');
        }
    } catch (err) {
        showToast('Error connecting to server', 'error');
        console.error(err);
    }
}

// TOGGLE SAVE CAREER
async function toggleSaveCareer(careerId, isSaved) {
    try {
        const res = await apiFetch(`${API_BASE}/onet/career/${careerId}/save`, {
            method: 'PUT',
            body: JSON.stringify({ is_saved: isSaved })
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            // Reload saved careers list
            loadSavedCareers();
            // Re-run search to update button states if a search is active
            searchCareers();
        }
    } catch (err) {
        showToast('Error saving career', 'error');
    }
}

// SKILL GAP ANALYSIS
async function analyzeSkillGap(careerId) {
    selectedCareerId = careerId;

    try {
        const res = await apiFetch(`${API_BASE}/onet/skill-gap/${careerId}`);
        const data = await res.json();

        if (data.success) {
            const section = document.getElementById('skillGapSection');
            if (section) {
                section.style.display = 'block';
                section.scrollIntoView({ behavior: 'smooth' });
            }

            const titleEl = document.getElementById('gapCareerTitle');
            const hasEl = document.getElementById('gapHasCount');
            const missEl = document.getElementById('gapMissCount');
            const matchEl = document.getElementById('gapMatchPercent');

            if (titleEl) titleEl.textContent = data.career.career_title;
            if (hasEl) hasEl.textContent = data.analysis.skills_you_have;
            if (missEl) missEl.textContent = data.analysis.skills_to_learn;
            if (matchEl) matchEl.textContent = `${data.analysis.match_percentage}%`;

            const hasSkillsEl = document.getElementById('gapHasSkills');
            if (hasSkillsEl) {
                hasSkillsEl.innerHTML = data.analysis.has_skills.length > 0
                    ? data.analysis.has_skills.map(s => `<span class="skill-tag has">${escapeHtml(s.skill_name)}</span>`).join('')
                    : '<span style="color:var(--text-muted);">None</span>';
            }

            const missSkillsEl = document.getElementById('gapMissSkills');
            if (missSkillsEl) {
                missSkillsEl.innerHTML = data.analysis.missing_skills.length > 0
                    ? data.analysis.missing_skills.map(s => `<span class="skill-tag missing">${escapeHtml(s.skill_name)}</span>`).join('')
                    : '<span style="color:var(--accent-emerald);">You have all required skills! 🎉</span>';
            }
        }
    } catch (err) {
        showToast('Error analyzing skill gap', 'error');
        console.error(err);
    }
}

// GENERATE ROADMAP
async function generateRoadmap() {
    if (!selectedCareerId) {
        showToast('Select a career first', 'warning');
        return;
    }

    // Auto-save the career when generating roadmap
    await toggleSaveCareer(selectedCareerId, true);

    const btn = document.getElementById('generateRoadmapBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Generating...';
    }

    try {
        const res = await apiFetch(`${API_BASE}/onet/roadmap/${selectedCareerId}`, {
            method: 'POST'
        });
        const data = await res.json();

        if (data.success) {
            showToast('Roadmap generated! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'roadmap.html';
            }, 1500);
        } else {
            showToast(data.message || 'Error generating roadmap', 'error');
        }
    } catch (err) {
        showToast('Error connecting to server', 'error');
        console.error(err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🗺️ Generate Learning Roadmap';
        }
    }
}

// Enter key search
document.getElementById('careerSearch')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCareers();
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    setupSidebarUser();
    loadMySkills();
    loadSavedCareers();
});