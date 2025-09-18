INSERT INTO users (username, password_hash, him_id, him_coins, is_premium, is_verified, is_admin, created_at) 
VALUES ('Himo', 'admin', 'HIM000', 999999, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP);

INSERT INTO chats (name, description, created_by) VALUES 
('Общий чат', 'Главный чат для всех пользователей', 1),
('Разработка', 'Обсуждение разработки и обновлений', 1),
('Мемы', 'Место для шуток и мемов', 1);

INSERT INTO chat_members (chat_id, user_id) VALUES (1, 1), (2, 1), (3, 1);