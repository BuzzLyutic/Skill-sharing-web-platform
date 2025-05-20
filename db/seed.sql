-- seed.sql

-- Пользователи
-- Пароль для всех 'password123' (bcrypt хэш: $2a$10$YOUR_BCRYPT_HASH_HERE_FOR_password123)
-- Замените $2a$10$... на реальный хэш, сгенерированный вашим бэкендом для 'password123'
-- Можно временно добавить в AuthHandler.Register логирование хеша и зарегистрировать юзера через API.
-- Или использовать онлайн bcrypt генератор, но убедитесь, что cost factor совпадает.

-- Для примера используем плейсхолдеры для хэшей.
-- Генерируйте их через ваш backend:
-- hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
-- fmt.Println(string(hashedPassword))

-- Вставьте СЮДА РЕАЛЬНЫЕ ХЭШИ!
-- Например, для "password123" с bcrypt.DefaultCost (обычно 10) хэш будет примерно такой:
-- $2a$10$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuv.abcdefghijkl
-- ВАЖНО: Используйте хэши, сгенерированные вашим приложением!

-- Admin User (замените хэш)
INSERT INTO users (id, email, password_hash, name, role, skills) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@example.com', '$2a$10$....your_admin_hash....', 'Admin User', 'admin', '{"Go", "React", "Docker"}');

-- Moderator User (замените хэш)
INSERT INTO users (id, email, password_hash, name, role, skills) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'moderator@example.com', '$2a$10$....your_moderator_hash....', 'Moderator User', 'moderator', '{"Content Review", "Community Management"}');

-- Regular User 1 (замените хэш)
INSERT INTO users (id, email, password_hash, name, role, skills) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'user1@example.com', '$2a$10$....your_user1_hash....', 'Alice Wonderland', 'user', '{"JavaScript", "Next.js"}');

-- Regular User 2 (замените хэш)
INSERT INTO users (id, email, password_hash, name, role, skills) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'user2@example.com', '$2a$10$....your_user2_hash....', 'Bob The Builder', 'user', '{"Go", "SQL", "System Design"}');


-- Сессии (используем ID созданных пользователей)
INSERT INTO sessions (id, title, description, category, date_time, location, max_participants, creator_id) VALUES
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Intro to Go Programming', 'Learn the basics of Go.', 'Programming', NOW() + INTERVAL '3 day', 'Online', 10, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'), -- Bob
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Advanced React Patterns', 'Deep dive into React hooks and state management.', 'Programming', NOW() + INTERVAL '5 day', 'Room 101', 15, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'), -- Alice
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'Database Design Basics', 'Fundamentals of relational database design.', 'Databases', NOW() + INTERVAL '2 day', 'Online', 20, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'), -- Bob
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'Effective Community Moderation', 'Tips and tricks for moderators.', 'Community Management', NOW() + INTERVAL '7 day', 'Conference Hall B', 50, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'); -- Moderator


-- Участники сессий
INSERT INTO session_participants (session_id, user_id) VALUES
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'), -- Alice joins Bob's Go session
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'); -- Bob joins Alice's React session


-- Отзывы
INSERT INTO feedback (session_id, user_id, rating, comment) VALUES
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 5, 'Great introduction to Go! Bob was very clear.'), -- Alice reviews Bob's Go session
('s0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 4, 'Good overview of React patterns, a bit fast-paced.'); -- Bob reviews Alice's React session

-- Обновите средние рейтинги вручную или убедитесь, что триггер сработал
-- Если триггер update_average_rating настроен на AFTER INSERT, он должен был сработать.
-- Можно выполнить SELECT, чтобы проверить.
SELECT email, average_rating from users;