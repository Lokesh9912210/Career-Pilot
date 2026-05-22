

CREATE DATABASE IF NOT EXISTS careerpilot;
USE careerpilot;

--Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    profile_pic VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

 --Resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    raw_text LONGTEXT,
    resume_score INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User skills extracted from resumes
CREATE TABLE IF NOT EXISTS user_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resume_id INT,
    skill_name VARCHAR(100),
    proficiency_level VARCHAR(50) DEFAULT 'intermediate',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

-- O*NET career matches
CREATE TABLE IF NOT EXISTS onet_careers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    onet_code VARCHAR(20),
    career_title VARCHAR(255),
    match_score INT DEFAULT 0,
    is_saved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Required skills per career from O*NET
CREATE TABLE IF NOT EXISTS onet_required_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    career_id INT NOT NULL,
    skill_name VARCHAR(100),
    importance_level FLOAT DEFAULT 0,
    user_has BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (career_id) REFERENCES onet_careers(id) ON DELETE CASCADE
);

-- Roadmap learning steps
CREATE TABLE IF NOT EXISTS roadmap_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    career_id INT NOT NULL,
    step_order INT,
    title VARCHAR(255),
    description TEXT,
    skill_to_learn VARCHAR(100),
    resource_link VARCHAR(500),
    target_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (career_id) REFERENCES onet_careers(id) ON DELETE CASCADE
);

-- Saved jobs from Adzuna
CREATE TABLE IF NOT EXISTS saved_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_title VARCHAR(255),
    company VARCHAR(255),
    location VARCHAR(255),
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    job_url VARCHAR(500),
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email sending logs
CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email_type VARCHAR(50),
    status VARCHAR(50),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
