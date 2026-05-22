// Toggle password visibility
function togglePassword() {
    const pwd = document.getElementById('password');
    if (pwd) pwd.type = pwd.type === 'password' ? 'text' : 'password';
}

// LOGIN HANDLER
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');
        const text = document.getElementById('loginText');
        const spinner = document.getElementById('loginSpinner');

        btn.disabled = true;
        if (text) text.style.display = 'none';
        if (spinner) spinner.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showToast('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showToast(data.message || 'Login failed', 'error');
            }
        } catch (err) {
            showToast('Connection error. Is the server running?', 'error');
            console.error(err);
        } finally {
            btn.disabled = false;
            if (text) text.style.display = 'block';
            if (spinner) spinner.style.display = 'none';
        }
    });
}

// REGISTER HANDLER
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const full_name = document.getElementById('full_name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm_password').value;

        if (password !== confirm) {
            showToast('Passwords do not match!', 'error');
            return;
        }

        const btn = document.getElementById('registerBtn');
        const text = document.getElementById('registerText');
        const spinner = document.getElementById('registerSpinner');

        btn.disabled = true;
        if (text) text.style.display = 'none';
        if (spinner) spinner.style.display = 'block';

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ full_name, email, password, phone })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showToast('Account created successfully!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                const msg = data.errors ? data.errors.map(e => e.msg).join(', ') : data.message;
                showToast(msg || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Connection error. Is the server running?', 'error');
            console.error(err);
        } finally {
            btn.disabled = false;
            if (text) text.style.display = 'block';
            if (spinner) spinner.style.display = 'none';
        }
    });
}

// Check if already logged in
(function () {
    const token = localStorage.getItem('token');
    const isAuthPage = window.location.pathname.includes('login') || window.location.pathname.includes('register');

    if (token && isAuthPage) {
        window.location.href = 'dashboard.html';
    }
})();