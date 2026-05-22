
async function loadCareers() {
    try {
        // Only load SAVED careers
        const res = await apiFetch(`${API_BASE}/onet/saved-careers`);
        const data = await res.json();

        if (data.success && data.careers.length > 0) {
            const select = document.getElementById('careerSelect');
            if (!select) return;

            // Clear existing options except placeholder
            select.innerHTML = '<option value="">-- Select a saved career --</option>';

            data.careers.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = `${c.career_title} (${c.match_score}% match)`;
                select.appendChild(option);
            });

            // Auto-select first and load
            select.value = data.careers[0].id;
            loadRoadmap();
        } else {
            const timeline = document.getElementById('roadmapTimeline');
            if (timeline) {
                timeline.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"></div>
                        <h3>No Saved Career Paths</h3>
                        <p>Go to Skills Analysis page, search for careers, and save the ones you're interested in.</p>
                        <a href="skills.html" class="btn btn-primary" style="margin-top:10px;"> Go to Skills</a>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error('Load careers error:', err);
    }
}

// LOAD ROADMAP
async function loadRoadmap(isAutoRety = false) {
    const selectEl = document.getElementById('careerSelect');
    const careerId = selectEl ? selectEl.value : null;
    if (!careerId) {
        showToast('Please select a career', 'warning');
        return;
    }

    try {
        const res = await apiFetch(`${API_BASE}/onet/roadmap/${careerId}`);
        const data = await res.json();

        if (data.success && data.steps.length > 0) {
            const timeline = document.getElementById('roadmapTimeline');
            const completed = data.steps.filter(s => s.is_completed).length;
            const total = data.steps.length;
            const pct = Math.round((completed / total) * 100);

            // Show progress
            const progressEl = document.getElementById('roadmapProgress');
            const fillEl = document.getElementById('roadmapProgressFill');
            const badgeEl = document.getElementById('progressBadge');
            const infoEl = document.getElementById('progressInfo');

            if (progressEl) progressEl.style.display = 'block';
            if (fillEl) fillEl.style.width = pct + '%';
            if (badgeEl) badgeEl.textContent = `${pct}% Complete`;
            if (infoEl) infoEl.textContent = `${completed} of ${total} steps completed`;

            // Render timeline
            if (timeline) {
                timeline.innerHTML = `
                    <div class="roadmap-timeline">
                        ${data.steps.map(step => `
                            <div class="timeline-item ${step.is_completed ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-card">
                                    <h4>${escapeHtml(step.title)}</h4>
                                    <p>${escapeHtml(step.description || '')}</p>
                                    <div class="timeline-meta">
                                        <span>🎯 ${escapeHtml(step.skill_to_learn || 'General')}</span>
                                        <span>📅 ${step.target_date ? new Date(step.target_date).toLocaleDateString() : 'No date'}</span>
                                    </div>
                                    <div style="margin-top:10px;display:flex;gap:8px;align-items:center;">
                                        <button class="complete-btn ${step.is_completed ? 'done' : ''}"
                                            onclick="toggleStep(${step.id}, ${!step.is_completed})">
                                            ${step.is_completed ? '✅ Completed' : '⬜ Mark Complete'}
                                        </button>
                                        ${step.resource_link ? `<a href="${escapeHtml(step.resource_link)}" target="_blank" style="font-size:0.8rem;color:var(--accent-cyan);">📚 Resources</a>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else if (data.success && data.steps.length === 0 && !isAutoRety) {
            // Auto generate roadmap if it doesn't exist yet!
            const timeline = document.getElementById('roadmapTimeline');
            if (timeline) timeline.innerHTML = '<div class="empty-state"><p>Generating roadmap...</p><div class="spinner" style="margin:20px auto;border-color:var(--accent-primary);border-bottom-color:transparent;"></div></div>';
            await generateNewRoadmap(true);
        } else {
            const timeline = document.getElementById('roadmapTimeline');
            const progressEl = document.getElementById('roadmapProgress');
            if (progressEl) progressEl.style.display = 'none';
            if (timeline) {
                timeline.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🗺️</div>
                        <h3>No Roadmap Generated Yet</h3>
                        <p>Go to Skills Analysis, find a career match, and generate a roadmap.</p>
                        <a href="skills.html" class="btn btn-primary" style="margin-top:10px;">Go to Skills</a>
                    </div>
                `;
            }
        }
    } catch (err) {
        showToast('Error loading roadmap', 'error');
        console.error('Roadmap error:', err);
    }
}

// TOGGLE STEP COMPLETION
async function toggleStep(stepId, completed) {
    try {
        const res = await apiFetch(`${API_BASE}/onet/roadmap/step/${stepId}`, {
            method: 'PUT',
            body: JSON.stringify({ is_completed: completed })
        });
        const data = await res.json();

        if (data.success) {
            showToast(completed ? 'Step completed! 🎉' : 'Step unmarked', 'success');
            loadRoadmap(true); // pass true so it doesn't try to auto-gen on failure
        }
    } catch (err) {
        showToast('Error updating step', 'error');
    }
}

// GENERATE NEW ROADMAP
async function generateNewRoadmap(isSilent = false) {
    const selectEl = document.getElementById('careerSelect');
    const careerId = selectEl ? selectEl.value : null;
    if (!careerId) {
        if (!isSilent) showToast('Please select a career', 'warning');
        return;
    }

    try {
        const res = await apiFetch(`${API_BASE}/onet/roadmap/${careerId}`, {
            method: 'POST'
        });
        const data = await res.json();

        if (data.success) {
            if (!isSilent) showToast('New roadmap generated!', 'success');
            loadRoadmap(true); // passing true to prevent infinite auto-gen
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Error generating roadmap', 'error');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    setupSidebarUser();
    loadCareers();
});