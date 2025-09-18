import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  username: string;
  himId: string;
  himCoins: number;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  dailyCoinsCollected?: boolean;
}

interface Chat {
  id: number;
  name: string;
  description?: string;
  isGroup: boolean;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: number;
  text: string;
  timestamp: string;
  username: string;
  himId: string;
  isPremium: boolean;
  isVerified: boolean;
  userId: number;
}

const BACKEND_URLS = {
  auth: 'https://functions.poehali.dev/6083b08d-5bbd-430f-8b54-8acded046948',
  chats: 'https://functions.poehali.dev/84306ecb-4031-4be8-8d3b-4ca8cec47f96',
  admin: 'https://functions.poehali.dev/27d83ee2-86ef-4406-b188-d1fe2d92652a'
};

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'register' | 'chats' | 'chat' | 'friends' | 'profile' | 'admin' | 'premium'>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Чаты и сообщения
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Админ данные
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminAction, setAdminAction] = useState<'coins' | 'messages' | null>(null);
  const [coinsAmount, setCoinsAmount] = useState('');

  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '' });

  // API Functions
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  };

  const handleLogin = async () => {
    if (!authForm.username.trim() || !authForm.password.trim()) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await apiCall(BACKEND_URLS.auth, {
        method: 'POST',
        body: JSON.stringify({
          action: 'login',
          username: authForm.username.trim(),
          password: authForm.password.trim()
        })
      });

      if (result.success) {
        setCurrentUser(result.user);
        setCurrentScreen('chats');
        loadChats(result.user.id);
      } else {
        setError(result.error || 'Ошибка входа');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.username.trim() || !registerForm.password.trim()) {
      setError('Заполните все поля');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (registerForm.username.length < 3 || registerForm.password.length < 3) {
      setError('Имя пользователя и пароль должны содержать минимум 3 символа');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await apiCall(BACKEND_URLS.auth, {
        method: 'POST',
        body: JSON.stringify({
          action: 'register',
          username: registerForm.username.trim(),
          password: registerForm.password.trim()
        })
      });

      if (result.success) {
        setCurrentUser(result.user);
        setCurrentScreen('chats');
        loadChats(result.user.id);
      } else {
        setError(result.error || 'Ошибка регистрации');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async (userId: number) => {
    try {
      const result = await apiCall(`${BACKEND_URLS.chats}?userId=${userId}&action=chats`);
      setChats(result.chats || []);
    } catch (err) {
      console.error('Error loading chats:', err);
    }
  };

  const loadMessages = async (chatId: number) => {
    if (!currentUser) return;
    
    try {
      const result = await apiCall(`${BACKEND_URLS.chats}?userId=${currentUser.id}&action=messages&chatId=${chatId}`);
      setMessages(result.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!currentUser || !currentChat || !newMessage.trim()) return;

    try {
      const result = await apiCall(BACKEND_URLS.chats, {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_message',
          userId: currentUser.id,
          chatId: currentChat.id,
          message: newMessage.trim()
        })
      });

      if (result.success) {
        setNewMessage('');
        loadMessages(currentChat.id);
        loadChats(currentUser.id);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const loadAdminData = async () => {
    if (!currentUser?.isAdmin) return;

    try {
      const [usersResult, reportsResult] = await Promise.all([
        apiCall(`${BACKEND_URLS.admin}?adminId=${currentUser.id}&action=users`),
        apiCall(`${BACKEND_URLS.admin}?adminId=${currentUser.id}&action=reports`)
      ]);
      
      setAllUsers(usersResult.users || []);
      setReports(reportsResult.reports || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  const adminActionHandler = async (action: string, userId: number, amount?: number) => {
    if (!currentUser?.isAdmin) return;

    try {
      const payload: any = {
        adminId: currentUser.id,
        userId: userId,
        action: action
      };

      if (amount) payload.amount = amount;

      let url = BACKEND_URLS.admin;
      let method = 'POST';

      if (action === 'delete_user') {
        url += `?adminId=${currentUser.id}&userId=${userId}&action=delete_user`;
        method = 'DELETE';
      }

      const result = await apiCall(url, {
        method: method,
        ...(method === 'POST' ? { body: JSON.stringify(payload) } : {})
      });

      if (result.success) {
        loadAdminData();
        setSelectedUser(null);
        setAdminAction(null);
        setCoinsAmount('');
      }
    } catch (err) {
      console.error('Error performing admin action:', err);
    }
  };

  const openChat = (chat: Chat) => {
    setCurrentChat(chat);
    setCurrentScreen('chat');
    loadMessages(chat.id);
  };

  useEffect(() => {
    if (currentUser && currentScreen === 'admin' && currentUser.isAdmin) {
      loadAdminData();
    }
  }, [currentUser, currentScreen]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-whatsapp-gray flex items-center justify-center font-roboto">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-whatsapp-darkGreen flex items-center justify-center gap-2">
              <Icon name="MessageCircle" size={32} />
              Himo Messenger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentScreen} onValueChange={(value) => setCurrentScreen(value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auth">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
              
              <TabsContent value="auth" className="space-y-4">
                <Input
                  placeholder="Имя пользователя"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                  disabled={loading}
                />
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  disabled={loading}
                />
                {error && (
                  <Alert className="border-red-500">
                    <Icon name="AlertCircle" size={16} />
                    <AlertDescription className="text-red-600">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-whatsapp-green hover:bg-whatsapp-darkGreen"
                >
                  {loading ? 'Вход...' : 'Войти'}
                </Button>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <Input
                  placeholder="Имя пользователя"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                  disabled={loading}
                />
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  disabled={loading}
                />
                <Input
                  type="password"
                  placeholder="Подтвердите пароль"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                  disabled={loading}
                />
                {error && (
                  <Alert className="border-red-500">
                    <Icon name="AlertCircle" size={16} />
                    <AlertDescription className="text-red-600">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full bg-whatsapp-green hover:bg-whatsapp-darkGreen"
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whatsapp-gray font-roboto">
      {/* Header */}
      <div className="bg-whatsapp-darkGreen text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentScreen === 'chat' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('chats')}
              className="text-white hover:bg-whatsapp-green mr-2"
            >
              <Icon name="ArrowLeft" size={16} />
            </Button>
          )}
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-whatsapp-green text-xs">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold flex items-center gap-1">
              {currentScreen === 'chat' ? currentChat?.name : currentUser.username}
              {currentUser.isPremium && <span className="text-himcoin-gold">+</span>}
              {currentUser.isVerified && <Icon name="CheckCircle" size={16} className="text-blue-400" />}
              {currentUser.isAdmin && <Icon name="Shield" size={16} className="text-red-400" />}
            </h1>
            <p className="text-xs opacity-80">
              {currentScreen === 'chat' ? `${currentChat?.description || 'Чат'}` : `ID: ${currentUser.himId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentScreen !== 'chat' && (
            <div className="flex items-center gap-1 bg-himcoin-gold text-black px-2 py-1 rounded-full text-xs">
              <Icon name="Coins" size={14} />
              {currentUser.himCoins}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentUser(null)}
            className="text-white hover:bg-whatsapp-green"
          >
            <Icon name="LogOut" size={16} />
          </Button>
        </div>
      </div>

      {/* Navigation - скрываем в чате */}
      {currentScreen !== 'chat' && (
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            <Button
              variant={currentScreen === 'chats' ? 'default' : 'ghost'}
              className={`flex-1 rounded-none ${currentScreen === 'chats' ? 'bg-whatsapp-green' : ''}`}
              onClick={() => setCurrentScreen('chats')}
            >
              <Icon name="MessageCircle" size={18} />
              Чаты
            </Button>
            <Button
              variant={currentScreen === 'friends' ? 'default' : 'ghost'}
              className={`flex-1 rounded-none ${currentScreen === 'friends' ? 'bg-whatsapp-green' : ''}`}
              onClick={() => setCurrentScreen('friends')}
            >
              <Icon name="Users" size={18} />
              Друзья
            </Button>
            <Button
              variant={currentScreen === 'profile' ? 'default' : 'ghost'}
              className={`flex-1 rounded-none ${currentScreen === 'profile' ? 'bg-whatsapp-green' : ''}`}
              onClick={() => setCurrentScreen('profile')}
            >
              <Icon name="User" size={18} />
              Профиль
            </Button>
            {currentUser.isAdmin && (
              <Button
                variant={currentScreen === 'admin' ? 'default' : 'ghost'}
                className={`flex-1 rounded-none ${currentScreen === 'admin' ? 'bg-whatsapp-green' : ''}`}
                onClick={() => setCurrentScreen('admin')}
              >
                <Icon name="Shield" size={18} />
                Админ
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={currentScreen === 'chat' ? 'h-[calc(100vh-64px)] flex flex-col' : 'p-4'}>
        {currentScreen === 'chats' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Чаты</h2>
              <Button 
                size="sm" 
                className="bg-whatsapp-green hover:bg-whatsapp-darkGreen"
                onClick={() => loadChats(currentUser.id)}
              >
                <Icon name="RefreshCw" size={16} />
              </Button>
            </div>
            {chats.map((chat) => (
              <Card 
                key={chat.id} 
                className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => openChat(chat)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-whatsapp-lightGreen">
                      {chat.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{chat.name}</h3>
                      <span className="text-xs text-gray-500">{chat.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <Badge className="bg-whatsapp-green text-white">{chat.unread}</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {currentScreen === 'chat' && currentChat && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.userId === currentUser.id
                        ? 'bg-whatsapp-green text-white'
                        : 'bg-white border'
                    }`}
                  >
                    {message.userId !== currentUser.id && (
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-semibold text-whatsapp-darkGreen">
                          {message.username}
                        </span>
                        {message.isPremium && <span className="text-himcoin-gold text-xs">+</span>}
                        {message.isVerified && <Icon name="CheckCircle" size={12} className="text-blue-500" />}
                      </div>
                    )}
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Введите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-whatsapp-green hover:bg-whatsapp-darkGreen"
                >
                  <Icon name="Send" size={16} />
                </Button>
              </div>
            </div>
          </>
        )}

        {currentScreen === 'friends' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Друзья</h2>
              <Button size="sm" className="bg-whatsapp-green hover:bg-whatsapp-darkGreen">
                <Icon name="UserPlus" size={16} />
              </Button>
            </div>
            <Input placeholder="Поиск по HIM ID..." className="mb-4" />
            <Card className="p-4 text-center text-gray-500">
              <p>Система друзей будет добавлена в следующих обновлениях</p>
            </Card>
          </div>
        )}

        {currentScreen === 'profile' && (
          <div className="space-y-4 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Мой профиль</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-whatsapp-lightGreen text-lg">
                      {currentUser.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {currentUser.username}
                      {currentUser.isPremium && <span className="text-himcoin-gold text-xl">+</span>}
                      {currentUser.isVerified && <Icon name="CheckCircle" size={20} className="text-blue-500" />}
                      {currentUser.isAdmin && <Icon name="Shield" size={20} className="text-red-500" />}
                    </h3>
                    <p className="text-gray-600">ID: {currentUser.himId}</p>
                  </div>
                </div>
                
                <div className="bg-himcoin-lightGold p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="Coins" size={20} className="text-himcoin-gold" />
                      <span className="font-semibold">{currentUser.himCoins} HimCoins</span>
                    </div>
                    <Button
                      disabled={currentUser.dailyCoinsCollected}
                      size="sm"
                      className="bg-himcoin-gold text-black hover:bg-yellow-500"
                    >
                      {currentUser.dailyCoinsCollected ? 'Собрано' : 'Получить 100'}
                    </Button>
                  </div>
                </div>

                {!currentUser.isPremium && (
                  <Button
                    onClick={() => setCurrentScreen('premium')}
                    className="w-full bg-himcoin-gold text-black hover:bg-yellow-500"
                  >
                    <Icon name="Star" size={16} />
                    Получить Premium
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentScreen === 'admin' && currentUser.isAdmin && (
          <div className="space-y-4 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Icon name="Shield" size={24} />
                  Панель администратора
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Icon name="AlertTriangle" size={16} />
                  <AlertDescription>
                    Вы вошли как администратор. Будьте осторожны с действиями.
                  </AlertDescription>
                </Alert>
                
                {/* Users Management */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Управление пользователями ({allUsers.length})</h3>
                    <Button 
                      size="sm" 
                      onClick={loadAdminData}
                      className="bg-whatsapp-green hover:bg-whatsapp-darkGreen"
                    >
                      <Icon name="RefreshCw" size={16} />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allUsers.map((user) => (
                      <Card key={user.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-whatsapp-lightGreen text-xs">
                                {user.username.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{user.username}</span>
                                {user.isPremium && <span className="text-himcoin-gold">+</span>}
                                {user.isVerified && <Icon name="CheckCircle" size={16} className="text-blue-500" />}
                                {user.isAdmin && <Icon name="Shield" size={16} className="text-red-500" />}
                                {user.isBanned && <Badge variant="destructive">Заблокирован</Badge>}
                              </div>
                              <p className="text-xs text-gray-500">
                                ID: {user.himId} | Монеты: {user.himCoins}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <Icon name="Settings" size={14} />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Управление: {user.username}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      onClick={() => adminActionHandler(user.isBanned ? 'unban_user' : 'ban_user', user.id)}
                                      variant={user.isBanned ? "default" : "destructive"}
                                      disabled={user.id === 1}
                                    >
                                      <Icon name="Ban" size={16} />
                                      {user.isBanned ? 'Разблокировать' : 'Заблокировать'}
                                    </Button>
                                    <Button
                                      onClick={() => adminActionHandler('delete_user', user.id)}
                                      variant="destructive"
                                      disabled={user.id === 1}
                                    >
                                      <Icon name="Trash2" size={16} />
                                      Удалить
                                    </Button>
                                    <Button
                                      onClick={() => adminActionHandler(user.isAdmin ? 'remove_admin' : 'make_admin', user.id)}
                                      variant={user.isAdmin ? "destructive" : "default"}
                                    >
                                      <Icon name="Shield" size={16} />
                                      {user.isAdmin ? 'Снять админа' : 'Сделать админом'}
                                    </Button>
                                    <Button
                                      onClick={() => adminActionHandler('verify_user', user.id)}
                                      variant="outline"
                                      disabled={user.isVerified}
                                    >
                                      <Icon name="CheckCircle" size={16} />
                                      {user.isVerified ? 'Верифицирован' : 'Верифицировать'}
                                    </Button>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label>Выдать HimCoins</Label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        value={coinsAmount}
                                        onChange={(e) => setCoinsAmount(e.target.value)}
                                        placeholder="Количество"
                                      />
                                      <Button
                                        onClick={() => adminActionHandler('give_coins', user.id, parseInt(coinsAmount) || 0)}
                                        disabled={!coinsAmount || parseInt(coinsAmount) <= 0}
                                      >
                                        Выдать
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;