import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAuthSession, signIn as amplifySignIn, signOut as amplifySignOut, signUp as amplifySignUp, confirmSignUp as amplifyConfirmSignUp, getCurrentUser, AuthUser, fetchUserAttributes, UpdateUserAttributesOutput, UserAttributeKey } from 'aws-amplify/auth';
import { getUserAdminStatus } from '../config/admin';
import { logAuthEvent } from '../store/slices/auditSlice';
import { store } from '../store';

interface AuthContextType {
  user: AuthUser | null;
  attributes: Partial<Record<UserAttributeKey, string>> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  rememberMe: boolean;
  checkUser: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [attributes, setAttributes] = useState<Partial<Record<UserAttributeKey, string>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const checkUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      const userAttributes = await fetchUserAttributes();
      setUser(currentUser);
      setAttributes(userAttributes);

      // --- Get the ID token payload for group check ---
      const session = await fetchAuthSession();
      // @ts-ignore
      const idTokenPayload = session.tokens?.idToken?.payload || {};
      console.log('ID Token Payload:', idTokenPayload);

      // Guard for undefined attributes
      if (!userAttributes) {
        setIsAdmin(false);
        console.warn('User attributes are undefined. Skipping admin check.');
        return;
      }

      // --- Cognito group-based admin check ---
      let isAdminUser = false;
      const groups = idTokenPayload['cognito:groups'] || [];
      isAdminUser = Array.isArray(groups) && groups.includes('Admin');

      // Fallback to email/domain admin logic if not in group
      if (!isAdminUser) {
        isAdminUser = getUserAdminStatus(currentUser);
      }
      setIsAdmin(isAdminUser);

      // Store user info for audit logging
      localStorage.setItem('userEmail', userAttributes.email || 'unknown');
      localStorage.setItem('userId', currentUser.userId);

      // Log successful session check
      store.dispatch(logAuthEvent({
        action: 'SIGN_IN',
        details: `Session validated for user ${userAttributes.email}`,
        success: true,
        metadata: { userId: currentUser.userId, isAdmin: isAdminUser }
      }));
    } catch (error) {
      setUser(null);
      setAttributes(null);
      setIsAdmin(false);
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for remember me preference on app initialization
    const storedRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(storedRememberMe);
    
    checkUser();
  }, [checkUser]);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      await amplifySignIn({ username, password });
      
      // Log successful sign in
      store.dispatch(logAuthEvent({
        action: 'SIGN_IN',
        details: `User ${username} signed in successfully`,
        success: true,
        metadata: { username }
      }));
      
      await checkUser();
    } catch (error) {
      console.error('Error signing in:', error);
      
      // Log failed sign in
      store.dispatch(logAuthEvent({
        action: 'FAILED_LOGIN',
        details: `Failed login attempt for ${username}`,
        success: false,
        metadata: { username, error: (error as Error).message }
      }));
      
      throw error;
    }
  }, [checkUser]);

  const signOut = useCallback(async () => {
    try {
      const userEmail = localStorage.getItem('userEmail') || 'unknown';
      
      await amplifySignOut();
      setUser(null);
      setAttributes(null);
      setIsAdmin(false);
      
      // Log successful sign out
      store.dispatch(logAuthEvent({
        action: 'SIGN_OUT',
        details: `User ${userEmail} signed out`,
        success: true,
        metadata: { userEmail }
      }));
      
      // Clear stored user info and remember me preference
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      localStorage.removeItem('rememberMe');
      setRememberMe(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      await amplifySignUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
          },
        },
      });
      
      // Log successful sign up
      store.dispatch(logAuthEvent({
        action: 'SIGN_UP',
        details: `New user registration: ${email}`,
        success: true,
        metadata: { email, firstName, lastName }
      }));
    } catch (error) {
      console.error('Error signing up:', error);
      
      // Log failed sign up
      store.dispatch(logAuthEvent({
        action: 'SIGN_UP',
        details: `Failed user registration: ${email}`,
        success: false,
        metadata: { email, error: (error as Error).message }
      }));
      
      throw error;
    }
  }, []);

  const confirmSignUp = useCallback(async (username: string, code: string) => {
    try {
      await amplifyConfirmSignUp({ username, confirmationCode: code });
      
      // Log successful email verification
      store.dispatch(logAuthEvent({
        action: 'SIGN_UP',
        details: `Email verified for user ${username}`,
        success: true,
        metadata: { username }
      }));
    } catch (error) {
      console.error('Error confirming sign up:', error);
      
      // Log failed email verification
      store.dispatch(logAuthEvent({
        action: 'SIGN_UP',
        details: `Failed email verification for user ${username}`,
        success: false,
        metadata: { username, error: (error as Error).message }
      }));
      
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    attributes,
    isAuthenticated: !!user,
    isLoading,
    isAdmin,
    rememberMe,
    checkUser,
    signIn,
    signOut,
    signUp,
    confirmSignUp,
  }), [user, attributes, isLoading, isAdmin, rememberMe, checkUser, signIn, signOut, signUp, confirmSignUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 