import os
import json
import psycopg
from typing import Dict, Any
import hashlib

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Обработка авторизации и регистрации пользователей
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами: request_id, function_name, function_version, memory_limit_in_mb
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Обработка CORS OPTIONS запроса
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database connection not configured'})
        }
    
    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                if method == 'POST':
                    body_data = json.loads(event.get('body', '{}'))
                    action = body_data.get('action')
                    
                    if action == 'login':
                        username = body_data.get('username', '').strip()
                        password = body_data.get('password', '').strip()
                        
                        if not username or not password:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Username and password required'})
                            }
                        
                        # Поиск пользователя
                        cur.execute(
                            "SELECT id, username, password_hash, him_id, him_coins, is_premium, is_verified, is_admin, is_banned FROM users WHERE username = %s",
                            (username,)
                        )
                        user = cur.fetchone()
                        
                        if not user:
                            return {
                                'statusCode': 401,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Invalid credentials'})
                            }
                        
                        # Проверка пароля (простая проверка без хеширования для демо)
                        if user[2] != password:
                            return {
                                'statusCode': 401,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Invalid credentials'})
                            }
                        
                        # Проверка на бан
                        if user[8]:  # is_banned
                            return {
                                'statusCode': 403,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Account is banned'})
                            }
                        
                        # Обновление времени входа
                        cur.execute(
                            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s",
                            (user[0],)
                        )
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({
                                'success': True,
                                'user': {
                                    'id': user[0],
                                    'username': user[1],
                                    'himId': user[3],
                                    'himCoins': user[4],
                                    'isPremium': user[5],
                                    'isVerified': user[6],
                                    'isAdmin': user[7],
                                    'isBanned': user[8]
                                }
                            })
                        }
                    
                    elif action == 'register':
                        username = body_data.get('username', '').strip()
                        password = body_data.get('password', '').strip()
                        
                        if not username or not password:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Username and password required'})
                            }
                        
                        if len(username) < 3 or len(password) < 3:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Username and password must be at least 3 characters'})
                            }
                        
                        # Проверка существования пользователя
                        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                        if cur.fetchone():
                            return {
                                'statusCode': 409,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Username already exists'})
                            }
                        
                        # Генерация уникального HIM ID
                        him_id = None
                        for _ in range(100):  # Максимум 100 попыток
                            candidate_id = f"HIM{hash(username + str(context.request_id)) % 1000000:06d}"
                            cur.execute("SELECT id FROM users WHERE him_id = %s", (candidate_id,))
                            if not cur.fetchone():
                                him_id = candidate_id
                                break
                        
                        if not him_id:
                            return {
                                'statusCode': 500,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Could not generate unique HIM ID'})
                            }
                        
                        # Создание пользователя
                        cur.execute(
                            """INSERT INTO users (username, password_hash, him_id, him_coins, is_premium, is_verified, is_admin, is_banned, created_at)
                               VALUES (%s, %s, %s, 0, FALSE, FALSE, FALSE, FALSE, CURRENT_TIMESTAMP)
                               RETURNING id, username, him_id, him_coins, is_premium, is_verified, is_admin, is_banned""",
                            (username, password, him_id)
                        )
                        new_user = cur.fetchone()
                        
                        # Добавление в общий чат
                        cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (1, %s)", (new_user[0],))
                        conn.commit()
                        
                        return {
                            'statusCode': 201,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({
                                'success': True,
                                'user': {
                                    'id': new_user[0],
                                    'username': new_user[1],
                                    'himId': new_user[2],
                                    'himCoins': new_user[3],
                                    'isPremium': new_user[4],
                                    'isVerified': new_user[5],
                                    'isAdmin': new_user[6],
                                    'isBanned': new_user[7]
                                }
                            })
                        }
                
                return {
                    'statusCode': 405,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Method not allowed'})
                }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }