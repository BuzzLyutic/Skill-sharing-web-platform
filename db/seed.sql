
-- seed.sql

-- Пользователи
-- Пароль для всех: 'password123'
-- Реальный bcrypt хэш для 'password123' с cost factor 10:
-- $2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq

-- Admin User
INSERT INTO users (id, email, password_hash, name, role, skills, bio, average_rating, created_at, updated_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@example.com', '$2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq', 'Admin User', 'admin', '{"Go", "React", "Docker", "System Administration"}', 'Platform administrator with extensive technical background', 5.0, NOW() - INTERVAL '6 months', NOW());

-- Moderator User
INSERT INTO users (id, email, password_hash, name, role, skills, bio, average_rating, created_at, updated_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'moderator@example.com', '$2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq', 'Moderator User', 'moderator', '{"Content Review", "Community Management", "Conflict Resolution"}', 'Experienced community moderator ensuring quality content', 4.8, NOW() - INTERVAL '4 months', NOW());

-- Regular Users
INSERT INTO users (id, email, password_hash, name, role, skills, bio, average_rating, created_at, updated_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'alice@example.com', '$2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq', 'Alice Wonderland', 'user', '{"JavaScript", "React", "Next.js", "TypeScript"}', 'Frontend developer passionate about creating beautiful user interfaces', 4.5, NOW() - INTERVAL '3 months', NOW()),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'bob@example.com', '$2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq', 'Bob The Builder', 'user', '{"Go", "PostgreSQL", "System Design", "Docker"}', 'Backend engineer with focus on scalable systems', 4.7, NOW() - INTERVAL '5 months', NOW()),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'charlie@example.com', '$2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq', 'Charlie Brown', 'user', '{"Python", "Machine Learning", "Data Science"}', 'Data scientist exploring AI and ML applications', 4.3, NOW() - INTERVAL '2 months', NOW()),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'diana@example.com', '$2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq', 'Diana Prince', 'user', '{"UI/UX Design", "Figma", "Adobe XD", "User Research"}', 'Product designer creating user-centered experiences', 4.9, NOW() - INTERVAL '4 months', NOW()),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'evan@example.com', '$2a$10$3QxDjD1ylgBnxg8MvGLUe.NL2eRe1Rea0LO6DO0j3aBJxPVvdqGSq', 'Evan Green', 'user', '{"DevOps", "Kubernetes", "AWS", "CI/CD"}', 'DevOps engineer automating everything', 4.6, NOW() - INTERVAL '1 month', NOW());

-- Будущие сессии (важно для рекомендаций!)
INSERT INTO sessions (id, title, description, category, date_time, location, max_participants, creator_id, created_at, updated_at) VALUES
-- Сессии на следующую неделю
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Introduction to Go Programming', 'Learn the basics of Go programming language. We will cover syntax, goroutines, and building your first web server.', 'Programming', NOW() + INTERVAL '3 days', 'Online', 20, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Advanced React Patterns', 'Deep dive into React hooks, context API, and performance optimization techniques.', 'Programming', NOW() + INTERVAL '5 days', 'Room 101, Tech Hub', 15, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'Database Design Fundamentals', 'Learn how to design efficient and scalable database schemas. PostgreSQL focus.', 'Programming', NOW() + INTERVAL '7 days', 'Online', 25, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'UI/UX Design Principles', 'Essential design principles for creating user-friendly interfaces.', 'Design', NOW() + INTERVAL '4 days', 'Design Studio, Floor 3', 12, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', 'Python for Data Science', 'Introduction to pandas, numpy, and basic data visualization.', 'Data Science', NOW() + INTERVAL '6 days', 'Online', 30, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'Docker Containerization Workshop', 'Hands-on workshop on containerizing applications with Docker.', 'DevOps', NOW() + INTERVAL '8 days', 'Lab Room B', 18, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', 'TypeScript Best Practices', 'Learn TypeScript patterns and best practices for large-scale applications.', 'Programming', NOW() + INTERVAL '10 days', 'Online', 20, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18', 'Kubernetes for Beginners', 'Get started with Kubernetes - deployment, services, and basic orchestration.', 'DevOps', NOW() + INTERVAL '12 days', 'Online', 25, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19', 'Figma Design System Workshop', 'Create and maintain design systems in Figma for consistent UI.', 'Design', NOW() + INTERVAL '9 days', 'Creative Space', 10, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', NOW(), NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b20', 'Machine Learning Basics', 'Introduction to ML concepts and simple model building with scikit-learn.', 'Data Science', NOW() + INTERVAL '14 days', 'Online', 35, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NOW(), NOW());

-- Участники сессий (делаем некоторые сессии популярными)
INSERT INTO session_participants (session_id, user_id, joined_at) VALUES
-- Go Introduction (Bob's session)
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', NOW()),
-- React Patterns (Alice's session)
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', NOW()),
-- UI/UX Design (Diana's session)
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NOW()),
-- Docker Workshop (Evan's session)
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NOW()),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NOW());

-- Несколько прошедших сессий для истории (с отзывами)
INSERT INTO sessions (id, title, description, category, date_time, location, max_participants, creator_id, created_at, updated_at) VALUES
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'Git and GitHub Mastery', 'Master version control with Git and collaboration with GitHub.', 'Programming', NOW() - INTERVAL '7 days', 'Online', 15, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'CSS Grid and Flexbox', 'Modern CSS layout techniques for responsive design.', 'Design', NOW() - INTERVAL '5 days', 'Online', 20, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days');

-- Участники прошедших сессий
INSERT INTO session_participants (session_id, user_id, joined_at) VALUES
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', NOW() - INTERVAL '14 days'),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NOW() - INTERVAL '14 days'),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', NOW() - INTERVAL '12 days'),
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', NOW() - INTERVAL '12 days');

-- Отзывы для прошедших сессий
INSERT INTO feedback (id, session_id, user_id, rating, comment, created_at) VALUES
(gen_random_uuid(), 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 5, 'Excellent Git workshop! Bob explained complex concepts very clearly.', NOW() - INTERVAL '6 days'),
(gen_random_uuid(), 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 4, 'Great session, learned a lot about branching strategies.', NOW() - INTERVAL '6 days'),
(gen_random_uuid(), 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 5, 'Alice is an amazing teacher! CSS finally makes sense.', NOW() - INTERVAL '4 days'),
(gen_random_uuid(), 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 4, 'Very helpful session on modern CSS techniques.', NOW() - INTERVAL '4 days');

-- Уведомления (примеры)
INSERT INTO notifications (id, user_id, message, type, is_read, created_at, related_id, related_type) VALUES
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Bob The Builder joined your session "Advanced React Patterns"', 'new_participant', false, NOW() - INTERVAL '1 hour', 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'session'),
(gen_random_uuid(), 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Your session "Introduction to Go Programming" is starting in 3 days', 'session_reminder', false, NOW(), 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'session');

-- Проверка данных
SELECT 'Users created:' as info, COUNT(*) as count FROM users;
SELECT 'Sessions created:' as info, COUNT(*) as count FROM sessions;
SELECT 'Future sessions:' as info, COUNT(*) as count FROM sessions WHERE date_time > NOW();
SELECT 'Participants added:' as info, COUNT(*) as count FROM session_participants;
SELECT 'Feedback added:' as info, COUNT(*) as count FROM feedback;