// File handling
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('resumeFile');
const fileInfo = document.getElementById('fileInfo');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const nameEl = document.getElementById('fileName');
            const sizeEl = document.getElementById('fileSize');
            if (nameEl) nameEl.textContent = `📎 ${file.name}`;
            if (sizeEl) sizeEl.textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
            if (fileInfo) fileInfo.style.display = 'block';
            if (uploadZone) uploadZone.style.borderColor = 'var(--accent-emerald)';
        }
    });
}

// Drag and drop
if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('drag-over'); });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            fileInput.files = e.dataTransfer.files;
            const nameEl = document.getElementById('fileName');
            const sizeEl = document.getElementById('fileSize');
            if (nameEl) nameEl.textContent = `📎 ${file.name}`;
            if (sizeEl) sizeEl.textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
            if (fileInfo) fileInfo.style.display = 'block';
        } else {
            showToast('Please upload a PDF file only', 'error');
        }
    });
}

function clearFile() {
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (uploadZone) uploadZone.style.borderColor = '';
}

// UPLOAD RESUME

const resumeForm = document.getElementById('resumeForm');
if (resumeForm) {
    resumeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!requireAuth()) return;

        const file = fileInput.files[0];
        if (!file) {
            showToast('Please select a PDF file', 'error');
            return;
        }

        const btn = document.getElementById('uploadBtn');
        const text = document.getElementById('uploadText');
        const spinner = document.getElementById('uploadSpinner');
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (btn) btn.disabled = true;
        if (text) text.style.display = 'none';
        if (spinner) spinner.style.display = 'block';
        if (progressSection) progressSection.style.display = 'block';

        const stages = [
            { pct: 20, text: '📤 Uploading resume...' },
            { pct: 40, text: '📖 Parsing PDF content...' },
            { pct: 60, text: '🔍 Extracting skills...' },
            { pct: 80, text: '📊 Calculating resume score...' },
            { pct: 90, text: '💾 Saving results...' }
        ];

        let stageIndex = 0;
        const progressInterval = setInterval(() => {
            if (stageIndex < stages.length) {
                if (progressFill) progressFill.style.width = stages[stageIndex].pct + '%';
                if (progressText) progressText.textContent = stages[stageIndex].text;
                stageIndex++;
            }
        }, 800);

        try {
            const formData = new FormData();
            formData.append('resume', file);

            const res = await fetch(`${API_BASE}/resume/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                credentials: 'include',
                body: formData
            });

            const data = await res.json();
            clearInterval(progressInterval);
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '✅ Analysis complete!';

            if (data.success) {
                showToast('Resume analyzed successfully!', 'success');
                setTimeout(() => {
                    if (progressSection) progressSection.style.display = 'none';
                    const resultsSection = document.getElementById('resultsSection');
                    if (resultsSection) resultsSection.style.display = 'block';

                    const scoreEl = document.getElementById('resultScore');
                    const countEl = document.getElementById('resultSkillCount');
                    const fileEl = document.getElementById('resultFileName');
                    const skillsEl = document.getElementById('resultSkills');

                    if (scoreEl) scoreEl.textContent = data.data.resume_score;
                    if (countEl) countEl.textContent = data.data.skills_found;
                    if (fileEl) fileEl.textContent = data.data.file_name;

                    if (skillsEl) {
                        const skillsHtml = data.data.skills.map(s =>
                            `<span class="skill-tag neutral">${escapeHtml(s.name)}</span>`
                        ).join('');
                        skillsEl.innerHTML = skillsHtml || '<span class="skill-tag missing">No skills found</span>';
                    }

                    // Refresh history
                    loadResumeHistory();
                }, 1000);
            } else {
                showToast(data.message || 'Upload failed', 'error');
            }
        } catch (err) {
            clearInterval(progressInterval);
            showToast('Connection error. Is the server running?', 'error');
            console.error(err);
        } finally {
            if (btn) btn.disabled = false;
            if (text) text.style.display = 'block';
            if (spinner) spinner.style.display = 'none';
        }
    });
}

// LOAD RESUME HISTORY (with delete buttons)
async function loadResumeHistory() {
    try {
        const res = await fetch(`${API_BASE}/resume/history`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success && data.resumes.length > 0) {
            const html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Score</th>
                            <th>Uploaded</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.resumes.map(r => `
                            <tr id="resume-row-${r.id}">
                                <td>📄 ${escapeHtml(r.file_name)}</td>
                                <td><span class="badge ${r.resume_score >= 70 ? 'badge-emerald' : r.resume_score >= 40 ? 'badge-amber' : 'badge-rose'}">${r.resume_score}/100</span></td>
                                <td>${new Date(r.uploaded_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-danger" onclick="deleteResume(${r.id})">🗑️ Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            const historyEl = document.getElementById('resumeHistory');
            if (historyEl) historyEl.innerHTML = html;
        } else {
            const historyEl = document.getElementById('resumeHistory');
            if (historyEl) historyEl.innerHTML = '<div class="empty-state" style="padding:20px;"><p style="color:var(--text-muted);">No resumes uploaded yet</p></div>';
        }
    } catch (err) {
        console.error('History error:', err);
    }
}

// DELETE RESUME
async function deleteResume(resumeId) {
    if (!confirm('Delete this resume and its extracted skills?')) return;

    try {
        const res = await apiFetch(`${API_BASE}/resume/history/${resumeId}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (data.success) {
            showToast('Resume deleted', 'success');
            loadResumeHistory();
        } else {
            showToast(data.message || 'Delete failed', 'error');
        }
    } catch (err) {
        showToast('Error deleting resume', 'error');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    setupSidebarUser();
    loadResumeHistory();
});