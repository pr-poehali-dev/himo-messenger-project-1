import os
import json
import psycopg
from typing import Dict, Any
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление чатами и сообщениями в реальном времени
    Args: event - dict с httpMethod, body, queryStringParameters, pathParams
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
                
                if method == 'GET':
                    user_id = event.get('queryStringParameters', {}).get('userId')
                    action = event.get('queryStringParameters', {}).get('action', 'chats')
                    
                    if not user_id:
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'User ID required'})
                        }
                    
                    if action == 'chats':
                        # Получение чатов пользователя
                        cur.execute("""
                            SELECT c.id, c.name, c.description, c.is_group,
                                   (SELECT message_text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                                   (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                                   (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND created_at > COALESCE((SELECT last_login FROM users WHERE id = %s), '1970-01-01')) as unread_count
                            FROM chats c
                            JOIN chat_members cm ON c.id = cm.chat_id
                            WHERE cm.user_id = %s
                            ORDER BY last_message_time DESC NULLS LAST
                        """, (user_id, user_id))
                        
                        chats = []
                        for row in cur.fetchall():
                            chat_time = row[5].strftime('%H:%M') if row[5] else ''
                            chats.append({
                                'id': row[0],
                                'name': row[1],
                                'description': row[2],
                                'isGroup': row[3],
                                'lastMessage': row[4] or 'Нет сообщений',
                                'timestamp': chat_time,
                                'unread': row[6] or 0
                            })
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'chats': chats})
                        }
                    
                    elif action == 'messages':
                        chat_id = event.get('queryStringParameters', {}).get('chatId')
                        if not chat_id:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Chat ID required'})
                            }
                        
                        # Получение сообщений чата
                        cur.execute("""
                            SELECT m.id, m.message_text, m.created_at, u.username, u.him_id, u.is_premium, u.is_verified
                            FROM messages m
                            JOIN users u ON m.user_id = u.id
                            WHERE m.chat_id = %s
                            ORDER BY m.created_at ASC
                            LIMIT 100
                        """, (chat_id,))
                        
                        messages = []
                        for row in cur.fetchall():
                            messages.append({
                                'id': row[0],
                                'text': row[1],
                                'timestamp': row[2].strftime('%H:%M'),
                                'username': row[3],
                                'himId': row[4],
                                'isPremium': row[5],
                                'isVerified': row[6],
                                'userId': user_id
                            })
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'messages': messages})
                        }
                
                elif method == 'POST':
                    body_data = json.loads(event.get('body', '{}'))
                    action = body_data.get('action')
                    user_id = body_data.get('userId')
                    
                    if not user_id:
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'User ID required'})
                        }
                    
                    if action == 'send_message':
                        chat_id = body_data.get('chatId')
                        message_text = body_data.get('message', '').strip()
                        
                        if not chat_id or not message_text:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Chat ID and message required'})
                            }
                        
                        # Проверка участия в чате
                        cur.execute("SELECT 1 FROM chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
                        if not cur.fetchone():
                            return {
                                'statusCode': 403,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Not a member of this chat'})
                            }
                        
                        # Отправка сообщения
                        cur.execute("""
                            INSERT INTO messages (chat_id, user_id, message_text, created_at)
                            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                            RETURNING id, created_at
                        """, (chat_id, user_id, message_text))
                        
                        result = cur.fetchone()
                        conn.commit()
                        
                        return {
                            'statusCode': 201,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({
                                'success': True,
                                'messageId': result[0],
                                'timestamp': result[1].strftime('%H:%M')
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