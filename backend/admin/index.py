import os
import json
import psycopg
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Административные функции для управления пользователями и контентом
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
                    admin_id = event.get('queryStringParameters', {}).get('adminId')
                    action = event.get('queryStringParameters', {}).get('action')
                    
                    if not admin_id:
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Admin ID required'})
                        }
                    
                    # Проверка прав администратора
                    cur.execute("SELECT is_admin FROM users WHERE id = %s", (admin_id,))
                    admin_check = cur.fetchone()
                    if not admin_check or not admin_check[0]:
                        return {
                            'statusCode': 403,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Access denied'})
                        }
                    
                    if action == 'users':
                        # Получение списка всех пользователей
                        cur.execute("""
                            SELECT id, username, him_id, him_coins, is_premium, is_verified, is_admin, is_banned, created_at, last_login
                            FROM users
                            ORDER BY created_at DESC
                        """)
                        
                        users = []
                        for row in cur.fetchall():
                            users.append({
                                'id': row[0],
                                'username': row[1],
                                'himId': row[2],
                                'himCoins': row[3],
                                'isPremium': row[4],
                                'isVerified': row[5],
                                'isAdmin': row[6],
                                'isBanned': row[7],
                                'createdAt': row[8].isoformat() if row[8] else None,
                                'lastLogin': row[9].isoformat() if row[9] else None
                            })
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'users': users})
                        }
                    
                    elif action == 'reports':
                        # Получение жалоб
                        cur.execute("""
                            SELECT r.id, r.reason, r.status, r.created_at,
                                   u1.username as reported_user, u2.username as reported_by
                            FROM reports r
                            JOIN users u1 ON r.reported_user_id = u1.id
                            JOIN users u2 ON r.reported_by_user_id = u2.id
                            ORDER BY r.created_at DESC
                        """)
                        
                        reports = []
                        for row in cur.fetchall():
                            reports.append({
                                'id': row[0],
                                'reason': row[1],
                                'status': row[2],
                                'createdAt': row[3].isoformat(),
                                'reportedUser': row[4],
                                'reportedBy': row[5]
                            })
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'reports': reports})
                        }
                    
                    elif action == 'user_messages':
                        target_user_id = event.get('queryStringParameters', {}).get('userId')
                        if not target_user_id:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Target user ID required'})
                            }
                        
                        # Получение сообщений пользователя
                        cur.execute("""
                            SELECT m.id, m.message_text, m.created_at, c.name as chat_name
                            FROM messages m
                            JOIN chats c ON m.chat_id = c.id
                            WHERE m.user_id = %s
                            ORDER BY m.created_at DESC
                            LIMIT 100
                        """, (target_user_id,))
                        
                        messages = []
                        for row in cur.fetchall():
                            messages.append({
                                'id': row[0],
                                'text': row[1],
                                'createdAt': row[2].isoformat(),
                                'chatName': row[3]
                            })
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'messages': messages})
                        }
                
                elif method == 'POST':
                    body_data = json.loads(event.get('body', '{}'))
                    admin_id = body_data.get('adminId')
                    action = body_data.get('action')
                    
                    if not admin_id:
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Admin ID required'})
                        }
                    
                    # Проверка прав администратора
                    cur.execute("SELECT is_admin FROM users WHERE id = %s", (admin_id,))
                    admin_check = cur.fetchone()
                    if not admin_check or not admin_check[0]:
                        return {
                            'statusCode': 403,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Access denied'})
                        }
                    
                    target_user_id = body_data.get('userId')
                    if not target_user_id:
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Target user ID required'})
                        }
                    
                    if action == 'ban_user':
                        # Заблокировать пользователя
                        cur.execute("UPDATE users SET is_banned = TRUE WHERE id = %s AND id != 1", (target_user_id,))
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'success': True, 'message': 'User banned'})
                        }
                    
                    elif action == 'unban_user':
                        # Разблокировать пользователя
                        cur.execute("UPDATE users SET is_banned = FALSE WHERE id = %s", (target_user_id,))
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'success': True, 'message': 'User unbanned'})
                        }
                    
                    elif action == 'make_admin':
                        # Сделать администратором
                        cur.execute("UPDATE users SET is_admin = TRUE WHERE id = %s", (target_user_id,))
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'success': True, 'message': 'User promoted to admin'})
                        }
                    
                    elif action == 'remove_admin':
                        # Убрать права администратора
                        cur.execute("UPDATE users SET is_admin = FALSE WHERE id = %s AND id != 1", (target_user_id,))
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'success': True, 'message': 'Admin rights removed'})
                        }
                    
                    elif action == 'give_coins':
                        amount = body_data.get('amount', 0)
                        if amount <= 0:
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Invalid amount'})
                            }
                        
                        # Выдать монеты
                        cur.execute("UPDATE users SET him_coins = him_coins + %s WHERE id = %s", (amount, target_user_id))
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'success': True, 'message': f'Gave {amount} coins'})
                        }
                    
                    elif action == 'verify_user':
                        # Верифицировать пользователя
                        cur.execute("UPDATE users SET is_verified = TRUE WHERE id = %s", (target_user_id,))
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'success': True, 'message': 'User verified'})
                        }
                
                elif method == 'DELETE':
                    query_params = event.get('queryStringParameters', {})
                    admin_id = query_params.get('adminId')
                    target_user_id = query_params.get('userId')
                    action = query_params.get('action')
                    
                    if not admin_id or not target_user_id:
                        return {
                            'statusCode': 400,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Admin ID and user ID required'})
                        }
                    
                    # Проверка прав администратора
                    cur.execute("SELECT is_admin FROM users WHERE id = %s", (admin_id,))
                    admin_check = cur.fetchone()
                    if not admin_check or not admin_check[0]:
                        return {
                            'statusCode': 403,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'error': 'Access denied'})
                        }
                    
                    if action == 'delete_user':
                        # Нельзя удалить главного админа
                        if target_user_id == '1':
                            return {
                                'statusCode': 400,
                                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                                'body': json.dumps({'error': 'Cannot delete main admin'})
                            }
                        
                        # Пометить пользователя как удаленного (мягкое удаление)
                        cur.execute("UPDATE users SET is_banned = TRUE, username = CONCAT('DELETED_', id) WHERE id = %s", (target_user_id,))
                        conn.commit()
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'success': True, 'message': 'User deleted'})
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