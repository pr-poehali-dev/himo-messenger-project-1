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
  id: string;
  username: string;
  password: string;
  himId: string;
  himCoins: number;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  avatar?: string;
  dailyCoinsCollected: boolean;
  lastLogin?: string;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  avatar?: string;
  unread: number;
}

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
  chatId: string;
}

interface Friend {
  id: string;
  username: string;
  himId: string;
  isOnline: boolean;
  avatar?: string;
}

interface Report {
  id: string;
  reportedUser: string;
  reportedBy: string;
  reason: string;
  timestamp: string;
}

// Database simulation using localStorage
const DB_KEY = 'himoMessengerDB';

interface Database {
  users: User[];
  messages: Message[];
  reports: Report[];
}

const loadDatabase = (): Database => {
  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  
  const defaultDB: Database = {
    users: [
      {
        id: 'admin',
        username: 'Himo',
        password: 'admin',
        himId: 'HIM000',
        himCoins: 999999,
        isPremium: true,
        isVerified: true,
        isAdmin: true,
        isBanned: false,
        dailyCoinsCollected: false,
        lastLogin: new Date().toISOString()
      }
    ],
    messages: [
      { id: '1', userId: 'admin', username: 'Himo', text: 'Добро пожаловать в Himo Messenger!', timestamp: '14:30', chatId: '1' },
      { id: '2', userId: 'user1', username: 'TestUser', text: 'Привет всем!', timestamp: '14:31', chatId: '1' },
    ],
    reports: [
      { id: '1', reportedUser: 'SpamBot', reportedBy: 'User123', reason: 'Спам в чате', timestamp: '15:20' },
      { id: '2', reportedUser: 'ToxicUser', reportedBy: 'CleanUser', reason: 'Оскорбления', timestamp: '14:10' },
    ]
  };
  
  saveDatabase(defaultDB);
  return defaultDB;
};

const saveDatabase = (db: Database) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'register' | 'chats' | 'friends' | 'profile' | 'admin' | 'premium'>('auth');
  const [database, setDatabase] = useState<Database>(loadDatabase());
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState<User | null>(null);
  const [adminAction, setAdminAction] = useState<'coins' | 'admin' | 'messages' | null>(null);
  const [coinsAmount, setCoinsAmount] = useState('');
  
  const chats = [
    { id: '1', name: 'Общий чат', lastMessage: 'Привет всем!', timestamp: '14:30', unread: 2 },
    { id: '2', name: 'Разработка', lastMessage: 'Обновление готово', timestamp: '13:45', unread: 0 },
    { id: '3', name: 'Мемы', lastMessage: '😂😂😂', timestamp: '12:20', unread: 5 },
  ];
  
  const friends = [
    { id: '1', username: 'AlexDev', himId: 'HIM001', isOnline: true },
    { id: '2', username: 'MariaDesign', himId: 'HIM002', isOnline: false },
    { id: '3', username: 'CodeMaster', himId: 'HIM003', isOnline: true },
  ];

  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const db = loadDatabase();
    setDatabase(db);
  }, []);

  const generateHimId = () => {
    let newId;
    do {
      newId = 'HIM' + Math.random().toString().substr(2, 6);
    } while (database.users.some(u => u.himId === newId));
    return newId;
  };

  const updateDatabase = (newDb: Database) => {
    setDatabase(newDb);
    saveDatabase(newDb);
  };

  const handleLogin = () => {
    setLoginError('');
    const user = database.users.find(u => 
      u.username === authForm.username && 
      u.password === authForm.password
    );
    
    if (user) {
      if (user.isBanned) {
        setLoginError('Аккаунт заблокирован');
        return;
      }
      
      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      const updatedDB = {
        ...database,
        users: database.users.map(u => u.id === user.id ? updatedUser : u)
      };
      updateDatabase(updatedDB);
      setCurrentUser(updatedUser);
      setCurrentScreen('chats');
    } else {
      setLoginError('Неверное имя пользователя или пароль');
    }
  };

  const handleRegister = () => {
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    
    if (database.users.some(u => u.username === registerForm.username)) {
      alert('Пользователь с таким именем уже существует');
      return;
    }
    
    const newUser: User = {
      id: Date.now().toString(),
      username: registerForm.username,
      password: registerForm.password,
      himId: generateHimId(),
      himCoins: 0,
      isPremium: false,
      isVerified: false,
      isAdmin: false,
      isBanned: false,
      dailyCoinsCollected: false,
      lastLogin: new Date().toISOString()
    };
    
    const updatedDB = {
      ...database,
      users: [...database.users, newUser]
    };
    updateDatabase(updatedDB);
    setCurrentUser(newUser);
    setCurrentScreen('chats');
  };

  const collectDailyCoins = () => {
    if (currentUser && !currentUser.dailyCoinsCollected) {
      const updatedUser = {
        ...currentUser,
        himCoins: currentUser.himCoins + 100,
        dailyCoinsCollected: true
      };
      const updatedDB = {
        ...database,
        users: database.users.map(u => u.id === currentUser.id ? updatedUser : u)
      };
      updateDatabase(updatedDB);
      setCurrentUser(updatedUser);
    }
  };

  const buyPremium = () => {
    if (currentUser && currentUser.himCoins >= 500) {
      const updatedUser = {
        ...currentUser,
        himCoins: currentUser.himCoins - 500,
        isPremium: true
      };
      const updatedDB = {
        ...database,
        users: database.users.map(u => u.id === currentUser.id ? updatedUser : u)
      };
      updateDatabase(updatedDB);
      setCurrentUser(updatedUser);
    } else {
      alert('Недостаточно HimCoins');
    }
  };

  const adminDeleteUser = (userId: string) => {
    if (userId === 'admin') {
      alert('Нельзя удалить главного администратора');
      return;
    }
    
    const updatedDB = {
      ...database,
      users: database.users.filter(u => u.id !== userId)
    };
    updateDatabase(updatedDB);
    setSelectedUserForAdmin(null);
  };

  const adminToggleBan = (userId: string) => {
    if (userId === 'admin') {
      alert('Нельзя заблокировать главного администратора');
      return;
    }
    
    const updatedDB = {
      ...database,
      users: database.users.map(u => 
        u.id === userId ? { ...u, isBanned: !u.isBanned } : u
      )
    };
    updateDatabase(updatedDB);
    setSelectedUserForAdmin(prev => 
      prev ? { ...prev, isBanned: !prev.isBanned } : null
    );
  };

  const adminToggleAdmin = (userId: string) => {
    const updatedDB = {
      ...database,
      users: database.users.map(u => 
        u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u
      )
    };
    updateDatabase(updatedDB);
    setSelectedUserForAdmin(prev => 
      prev ? { ...prev, isAdmin: !prev.isAdmin } : null
    );
  };

  const adminGiveCoins = (userId: string, amount: number) => {
    const updatedDB = {
      ...database,
      users: database.users.map(u => 
        u.id === userId ? { ...u, himCoins: u.himCoins + amount } : u
      )
    };
    updateDatabase(updatedDB);
    setSelectedUserForAdmin(prev => 
      prev ? { ...prev, himCoins: prev.himCoins + amount } : null
    );
    setCoinsAmount('');
    setAdminAction(null);
  };

  const getUserMessages = (userId: string) => {
    return database.messages.filter(m => m.userId === userId);
  };

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
                />
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                />
                {loginError && (
                  <Alert className="border-red-500">
                    <Icon name="AlertCircle" size={16} />
                    <AlertDescription className="text-red-600">
                      {loginError}
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handleLogin}
                  className="w-full bg-whatsapp-green hover:bg-whatsapp-darkGreen"
                >
                  Войти
                </Button>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <Input
                  placeholder="Имя пользователя"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                />
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                />
                <Input
                  type="password"
                  placeholder="Подтвердите пароль"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                />
                <Button 
                  onClick={handleRegister}
                  className="w-full bg-whatsapp-green hover:bg-whatsapp-darkGreen"
                >
                  Зарегистрироваться
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
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-whatsapp-green text-xs">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold flex items-center gap-1">
              {currentUser.username}
              {currentUser.isPremium && <span className="text-himcoin-gold">+</span>}
              {currentUser.isVerified && <Icon name="CheckCircle" size={16} className="text-blue-400" />}
              {currentUser.isAdmin && <Icon name="Shield" size={16} className="text-red-400" />}
            </h1>
            <p className="text-xs opacity-80">ID: {currentUser.himId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-himcoin-gold text-black px-2 py-1 rounded-full text-xs">
            <Icon name="Coins" size={14} />
            {currentUser.himCoins}
          </div>
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

      {/* Navigation */}
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

      {/* Content */}
      <div className="p-4">
        {currentScreen === 'chats' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Чаты</h2>
              <Button size="sm" className="bg-whatsapp-green hover:bg-whatsapp-darkGreen">
                <Icon name="Plus" size={16} />
              </Button>
            </div>
            {chats.map((chat) => (
              <Card key={chat.id} className="p-3 hover:bg-gray-50 cursor-pointer transition-colors">
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

        {currentScreen === 'friends' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Друзья</h2>
              <Button size="sm" className="bg-whatsapp-green hover:bg-whatsapp-darkGreen">
                <Icon name="UserPlus" size={16} />
              </Button>
            </div>
            <Input placeholder="Поиск по HIM ID..." className="mb-4" />
            {friends.map((friend) => (
              <Card key={friend.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-whatsapp-lightGreen">
                        {friend.username.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {friend.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{friend.username}</h3>
                    <p className="text-sm text-gray-600">ID: {friend.himId}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Icon name="MessageCircle" size={16} />
                  </Button>
                </div>
              </Card>
            ))}
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
                      onClick={collectDailyCoins}
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

        {currentScreen === 'premium' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="border-himcoin-gold">
              <CardHeader className="bg-gradient-to-r from-himcoin-gold to-yellow-500 text-black">
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Star" size={24} />
                  Himo Messenger+
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <h3 className="text-lg font-semibold">Премиум возможности:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Icon name="Check" size={16} className="text-green-500" />
                    Золотой знак + рядом с именем
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="Check" size={16} className="text-green-500" />
                    Возможность изменить свой HIM ID
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="Check" size={16} className="text-green-500" />
                    Приоритетная поддержка
                  </li>
                </ul>
                
                <div className="bg-himcoin-lightGold p-4 rounded-lg text-center">
                  <p className="text-lg font-bold">Стоимость: 500 HimCoins</p>
                  <p className="text-sm text-gray-600">У вас: {currentUser.himCoins} HimCoins</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={buyPremium}
                    disabled={currentUser.himCoins < 500}
                    className="flex-1 bg-himcoin-gold text-black hover:bg-yellow-500"
                  >
                    Купить Premium
                  </Button>
                  <Button
                    onClick={() => setCurrentScreen('profile')}
                    variant="outline"
                    className="flex-1"
                  >
                    Назад
                  </Button>
                </div>
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
                
                {/* Reports Section */}
                <div>
                  <h3 className="font-semibold mb-2">Жалобы ({database.reports.length})</h3>
                  <div className="space-y-2">
                    {database.reports.map((report) => (
                      <Card key={report.id} className="p-3 border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">На: {report.reportedUser}</p>
                            <p className="text-sm text-gray-600">От: {report.reportedBy}</p>
                            <p className="text-sm">{report.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive">
                              <Icon name="Ban" size={14} />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Icon name="X" size={14} />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                
                {/* Users Management */}
                <div>
                  <h3 className="font-semibold mb-2">Управление пользователями ({database.users.length})</h3>
                  <div className="space-y-2">
                    {database.users.map((user) => (
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
                                  onClick={() => setSelectedUserForAdmin(user)}
                                >
                                  <Icon name="Settings" size={14} />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Управление пользователем: {user.username}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      onClick={() => adminToggleBan(user.id)}
                                      variant={user.isBanned ? "default" : "destructive"}
                                      disabled={user.id === 'admin'}
                                    >
                                      <Icon name="Ban" size={16} />
                                      {user.isBanned ? 'Разблокировать' : 'Заблокировать'}
                                    </Button>
                                    <Button
                                      onClick={() => adminDeleteUser(user.id)}
                                      variant="destructive"
                                      disabled={user.id === 'admin'}
                                    >
                                      <Icon name="Trash2" size={16} />
                                      Удалить
                                    </Button>
                                    <Button
                                      onClick={() => adminToggleAdmin(user.id)}
                                      variant={user.isAdmin ? "destructive" : "default"}
                                    >
                                      <Icon name="Shield" size={16} />
                                      {user.isAdmin ? 'Снять админа' : 'Сделать админом'}
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          onClick={() => setAdminAction('coins')}
                                        >
                                          <Icon name="Coins" size={16} />
                                          Дать монеты
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Выдать HimCoins</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Количество монет</Label>
                                            <Input
                                              type="number"
                                              value={coinsAmount}
                                              onChange={(e) => setCoinsAmount(e.target.value)}
                                              placeholder="Введите количество"
                                            />
                                          </div>
                                          <Button
                                            onClick={() => adminGiveCoins(user.id, parseInt(coinsAmount) || 0)}
                                            className="w-full"
                                            disabled={!coinsAmount || parseInt(coinsAmount) <= 0}
                                          >
                                            Выдать монеты
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                  
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" className="w-full">
                                        <Icon name="MessageSquare" size={16} />
                                        Просмотреть сообщения
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Сообщения пользователя: {user.username}</DialogTitle>
                                      </DialogHeader>
                                      <div className="max-h-96 overflow-y-auto space-y-2">
                                        {getUserMessages(user.id).map((message) => (
                                          <Card key={message.id} className="p-3">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <p className="text-sm font-medium">{message.text}</p>
                                                <p className="text-xs text-gray-500">
                                                  Чат: {message.chatId} | {message.timestamp}
                                                </p>
                                              </div>
                                              <Button size="sm" variant="destructive">
                                                <Icon name="Trash2" size={12} />
                                              </Button>
                                            </div>
                                          </Card>
                                        ))}
                                        {getUserMessages(user.id).length === 0 && (
                                          <p className="text-center text-gray-500">Сообщений нет</p>
                                        )}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
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