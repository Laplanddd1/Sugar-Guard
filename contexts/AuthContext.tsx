import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  register: (username: string, password: string) => boolean;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'sugar_guard_users';
const CURRENT_USER_KEY = 'sugar_guard_current_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load current user and initialize mock DB
  useEffect(() => {
    // 1. Check if there is a logged in user
    const storedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // 2. Initialize mock database if empty
    const users = localStorage.getItem(STORAGE_KEY);
    if (!users) {
      const mockUsers = [
        { 
          username: 'user', 
          password: '123456', 
          role: UserRole.PATIENT, 
          name: '张三', 
          // Changed 'p1' to '1' so parseInt works correctly for the API
          id: '1', 
          avatar: 'https://picsum.photos/100/100?random=10',
          // Default mock profile
          profile: {
            age: 35,
            sex: '男',
            height: 175,
            weight: 75,
            waistline: 85,
            systolicPressure: 120,
            familyHistory: '无',
            disease: '否',
            isPregnancy: '否'
          }
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUsers));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const usersStr = localStorage.getItem(STORAGE_KEY);
    const users = usersStr ? JSON.parse(usersStr) : [];
    
    const foundUser = users.find((u: any) => u.username === username && u.password === password);
    
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const register = (username: string, password: string): boolean => {
    const usersStr = localStorage.getItem(STORAGE_KEY);
    const users = usersStr ? JSON.parse(usersStr) : [];

    if (users.find((u: any) => u.username === username)) {
      return false; // User exists
    }

    const newUser: User = {
      username,
      name: username,
      role: UserRole.PATIENT,
      id: Date.now().toString(),
      avatar: `https://picsum.photos/100/100?random=${Date.now() % 100}`,
      // Init empty profile
      profile: {
        age: 30,
        sex: '男',
        height: 170,
        weight: 65,
        familyHistory: '无',
        disease: '否',
        waistline: 80,
        systolicPressure: 110,
        isPregnancy: '否'
      }
    };
    // Don't store password in session state in real app, but ok for mock
    const userToStore = { ...newUser, password };

    users.push(userToStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    
    return login(username, password);
  };

  const updateProfile = (newProfile: UserProfile) => {
    if (!user) return;
    
    const updatedUser = { ...user, profile: newProfile };
    setUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    // Also update in the "database"
    const usersStr = localStorage.getItem(STORAGE_KEY);
    if (usersStr) {
      const users = JSON.parse(usersStr);
      const updatedUsers = users.map((u: any) => u.id === user.id ? { ...u, profile: newProfile } : u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
