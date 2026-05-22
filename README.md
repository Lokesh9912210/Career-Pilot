# 🚀 CareerPilot — AI Career Roadmap Platform

CareerPilot is a full-stack web application that helps you navigate your career journey. Upload your resume, discover your skills, get a personalized career roadmap, and find jobs that match your potential.

## ✨ Features

- **📄 Smart Resume Analysis** — Upload a PDF resume, extract skills via AI keyword matching, and get a resume score out of 100
- **🎯 Skills & Career Matching** — Compare your skills against O*NET career profiles and see your match percentage
- **🗺️ Career Roadmap** — Generate a step-by-step learning roadmap with target dates for each missing skill
- **💼 Job Search** — Search real jobs and internships from Adzuna based on your skills or keywords
- **🤖 Telegram Integration** — Connect with a Telegram bot via Make.com for instant notifications
- **📧 Email Notifications** — Receive analysis results and roadmap updates via email

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (mysql2) |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **File Upload** | Multer + pdf-parse |
| **External APIs** | O*NET, Adzuna, Make.com |
| **Email** | Nodemailer (Gmail SMTP) |

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [MySQL](https://www.mysql.com/) (v8+)
- API credentials (optional, for full features):
  - [O*NET Web Services](https://services.onetcenter.org/developer) — career data
  - [Adzuna Developer](https://developer.adzuna.com) — job listings
  - [Make.com](https://www.make.com) — Telegram bot integration
  - Gmail App Password — email notifications

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd CareerPilot/backend
npm install
```

### 2. Set Up Database

```bash
mysql -u root -p < schema.sql
```

This creates the `careerpilot` database and all required tables.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DB_PASSWORD=your_mysql_password
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ONET_USERNAME=your_onet_username
ONET_PASSWORD=your_onet_password
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

### 4. Run

```bash
npm run dev     # Development (hot reload with nodemon)
# or
npm start       # Production
```

Open **http://localhost:5000** in your browser.

## 📁 Project Structure

```
CareerPilot/
├── backend/
│   ├── config/
│   │   └── db.js              # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Register, Login, Profile, Logout
│   │   ├── resume.js          # Upload, Parse, Score, Skills extraction
│   │   ├── onet.js            # Career search, Skill gap, Roadmap
│   │   ├── jobs.js            # Job search (Adzuna), Save/Delete
│   │   └── webhook.js         # Make.com webhook, Email sending
│   ├── uploads/               # Uploaded PDF resumes
│   ├── schema.sql             # Database schema
│   ├── server.js              # Express app entry point
│   ├── package.json
│   ├── .env                   # Environment variables (not in git)
│   └── .env.example           # Environment template
├── frontend/
│   ├── css/
│   │   └── style.css          # Main stylesheet (dark glassmorphism theme)
│   ├── js/
│   │   ├── common.js          # Shared utilities (auth, API, toast, etc.)
│   │   ├── particles.js       # Background particle animation
│   │   ├── auth.js            # Login & Register handlers
│   │   ├── dashboard.js       # Dashboard data loading
│   │   ├── resume.js          # Resume upload & results
│   │   ├── skills.js          # Skills & career analysis
│   │   ├── roadmap.js         # Career roadmap viewer
│   │   └── jobs.js            # Job search & saved jobs
│   ├── pages/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── resume.html
│   │   ├── skills.html
│   │   ├── roadmap.html
│   │   └── jobs.html
│   └── index.html             # Landing page
├── .gitignore
└── README.md
```

## 📝 License

ISC
