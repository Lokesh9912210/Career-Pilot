let currentPage = 1;
let currentKeyword = '';
let currentLocation = '';

//  SEARCH JOBS
async function searchJobs(page = 1) {
    const keywordEl = document.getElementById('jobKeyword');
    const locationEl = document.getElementById('jobLocation');
    const keyword = keywordEl ? keywordEl.value.trim() : '';
    const location = locationEl ? locationEl.value.trim() : '';

    currentKeyword = keyword;
    currentLocation = location;
    currentPage = page;

    showToast('Searching jobs on Adzuna...', 'info');

    try {
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (location) params.append('location', location);
        params.append('page', page);

        const res = await apiFetch(`${API_BASE}/jobs/search?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
            const infoEl = document.getElementById('jobResultsInfo');
            const queryEl = document.getElementById('searchQuery');
            const totalEl = document.getElementById('totalJobs');
            if (infoEl) infoEl.style.display = 'block';
            if (queryEl) queryEl.textContent = keyword || 'your skills';
            if (totalEl) totalEl.textContent = data.total.toLocaleString();

            const gridEl = document.getElementById('jobsGrid');
            if (data.jobs.length > 0 && gridEl) {
                const html = data.jobs.map(job => `
                    <div class="glass-card job-card">
                        <h4 class="job-title">${escapeHtml(job.title)}</h4>
                        <div class="job-company">🏢 ${escapeHtml(job.company)}</div>
                        <div class="job-details">
                            <span>📍 ${escapeHtml(job.location)}</span>
                            ${job.salary_min ? `<span>💰 ${formatSalary(job.salary_min)} - ${formatSalary(job.salary_max)}</span>` : ''}
                            <span>📂 ${escapeHtml(job.category)}</span>
                        </div>
                        <div class="job-desc">${escapeHtml(job.description)}</div>
                        <div class="job-actions">
                            <a href="${escapeHtml(job.url)}" target="_blank" class="btn btn-primary btn-sm">🔗 Apply Now</a>
                            <button class="btn btn-secondary btn-sm" onclick='saveJob(${JSON.stringify(job).replace(/'/g, "\\'")})'>⭐ Save</button>
                        </div>
                    </div>
                `).join('');

                gridEl.innerHTML = html;

                // Pagination
                const paginationEl = document.getElementById('pagination');
                const pageInfoEl = document.getElementById('pageInfo');
                const prevBtn = document.getElementById('prevBtn');
                if (paginationEl) paginationEl.style.display = 'block';
                if (pageInfoEl) pageInfoEl.textContent = `Page ${page}`;
                if (prevBtn) prevBtn.disabled = page <= 1;
            } else if (gridEl) {
                gridEl.innerHTML = '<div class="empty-state glass-card" style="grid-column:1/-1;"><h3>No jobs found</h3><p>Try different keywords or location</p></div>';
            }

            showToast(`Found ${data.total} jobs!`, 'success');
        }
    } catch (err) {
        showToast('Error searching jobs', 'error');
        console.error(err);
    }
}

function formatSalary(amount) {
    if (!amount) return 'N/A';
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
}

// AUTO-SEARCH BY SKILLS
async function searchBySkills() {
    const keywordEl = document.getElementById('jobKeyword');
    if (keywordEl) keywordEl.value = '';
    searchJobs();
}

// PAGINATION
function nextPage() {
    searchJobs(currentPage + 1);
}

function prevPage() {
    if (currentPage > 1) searchJobs(currentPage - 1);
}

// SAVE JOB
async function saveJob(job) {
    try {
        const res = await apiFetch(`${API_BASE}/jobs/save`, {
            method: 'POST',
            body: JSON.stringify({
                job_title: job.title,
                company: job.company,
                location: job.location,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                job_url: job.url
            })
        });

        const data = await res.json();

        if (data.success) {
            showToast('Job saved! ⭐', 'success');
            loadSavedJobs();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Error saving job', 'error');
    }
}

// LOAD SAVED JOBS
async function loadSavedJobs() {
    try {
        const res = await apiFetch(`${API_BASE}/jobs/saved`);
        const data = await res.json();

        if (data.success) {
            const countEl = document.getElementById('savedCount');
            if (countEl) countEl.textContent = data.jobs.length;

            const listEl = document.getElementById('savedJobsList');
            if (data.jobs.length > 0 && listEl) {
                const html = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Job Title</th>
                                <th>Company</th>
                                <th>Location</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.jobs.map(j => `
                                <tr>
                                    <td style="font-weight:600;">${escapeHtml(j.job_title)}</td>
                                    <td style="color:var(--accent-tertiary);">${escapeHtml(j.company)}</td>
                                    <td>${escapeHtml(j.location)}</td>
                                    <td>
                                        <div style="display:flex;gap:6px;">
                                            <a href="${escapeHtml(j.job_url)}" target="_blank" class="btn btn-sm btn-primary">🔗 Apply</a>
                                            <button class="btn btn-sm btn-danger" onclick="removeSavedJob(${j.id})">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                listEl.innerHTML = html;
            } else if (listEl) {
                listEl.innerHTML = '<div class="empty-state" style="padding:20px;"><p style="color:var(--text-muted);">No saved jobs yet.</p></div>';
            }
        }
    } catch (err) {
        console.error('Load saved jobs error:', err);
    }
}

// REMOVE SAVED JOB
async function removeSavedJob(jobId) {
    try {
        const res = await apiFetch(`${API_BASE}/jobs/saved/${jobId}`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (data.success) {
            showToast('Job removed', 'info');
            loadSavedJobs();
        }
    } catch (err) {
        showToast('Error removing job', 'error');
    }
}

// Enter key search
document.getElementById('jobKeyword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchJobs();
});

document.getElementById('jobLocation')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchJobs();
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    setupSidebarUser();
    loadSavedJobs();
});