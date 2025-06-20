import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAuthSession, signIn as amplifySignIn, signOut as amplifySignOut, signUp as amplifySignUp, confirmSignUp as amplifyConfirmSignUp, getCurrentUser, AuthUser } from 'aws-amplify/auth';
import { getUserAdminStatus } from '../config/admin';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (username: string, password: string, email: string) => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Check admin status
      const adminStatus = getUserAdminStatus(currentUser);
      setIsAdmin(adminStatus);
      
      // Debug logging
      console.log('=== Admin Access Debug ===');
      console.log('Current user:', currentUser);
      console.log('User username:', currentUser.username);
      console.log('Admin status:', adminStatus);
      console.log('========================');
    } catch (error) {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(username: string, password: string) {
    try {
      await amplifySignIn({ username, password });
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      const adminStatus = getUserAdminStatus(currentUser);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await amplifySignOut();
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async function signUp(username: string, password: string, email: string) {
    try {
      await amplifySignUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  async function confirmSignUp(username: string, code: string) {
    try {
      await amplifyConfirmSignUp({ username, confirmationCode: code });
    } catch (error) {
      console.error('Error confirming sign up:', error);
      throw error;
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isAdmin,
    signIn,
    signOut,
    signUp,
    confirmSignUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 