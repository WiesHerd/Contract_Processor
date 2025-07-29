import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  signIn, 
  fetchAuthSession, 
  resetPassword as amplifyResetPassword, 
  confirmResetPassword as amplifyConfirmResetPassword
} from 'aws-amplify/auth';
import { useAuth } from '@/contexts/AuthContext';

type AuthError = {
  name: string;
  message: string;
};

// Password strength calculation
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' };
  return { score, label: 'Very Strong', color: 'bg-green-600' };
};

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    match: false,
    hasNumber: false,
    hasLetter: false,
    hasUppercase: false,
    hasLowercase: false,
    hasSpecial: false
  });
  const navigate = useNavigate();
  const { signIn: authSignIn, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Enhanced password validation
  useEffect(() => {
    setPasswordValidation({
      length: resetPassword.length >= 8,
      match: resetPassword === resetConfirmPassword && resetPassword.length > 0,
      hasNumber: /\d/.test(resetPassword),
      hasLetter: /[a-zA-Z]/.test(resetPassword),
      hasUppercase: /[A-Z]/.test(resetPassword),
      hasLowercase: /[a-z]/.test(resetPassword),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(resetPassword)
    });
  }, [resetPassword, resetConfirmPassword]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordStrength = calculatePasswordStrength(resetPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password: password
      });

      if (isSignedIn) {
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        
        // Clear any stored authentication state
        localStorage.removeItem('isAuthenticated');
        // Redirect to home page
        window.location.href = '/';
      } else if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        setError('Please check your email and confirm your account before signing in.');
      } else {
        setError('Sign-in failed. Please check your credentials and try again.');
      }
    } catch (err) {
      const authError = err as AuthError;
      
      // Enhanced error handling with recovery suggestions
      if (authError.message.includes('Password attempts exceeded') || 
          authError.message.includes('Too many requests') ||
          authError.message.includes('LimitExceededException') ||
          authError.message.includes('TooManyRequestsException')) {
        setError('Too many failed sign-in attempts. Please wait 15-30 minutes before trying again, or use "Forgot password?" to reset your password.');
      } else if (authError.message.includes('NotAuthorizedException')) {
        setError('Incorrect email or password. Please check your credentials or use "Forgot password?" to reset.');
      } else if (authError.message.includes('UserNotConfirmedException')) {
        setError('Account not confirmed. Please check your email and confirm your account before signing in.');
      } else if (authError.message.includes('UserNotFoundException')) {
        setError('Account not found. Please check your email address or create a new account.');
      } else if (authError.message.includes('InvalidParameterException')) {
        setError('Please enter a valid email address.');
      } else if (authError.message.includes('400') || authError.message.includes('Bad Request')) {
        // Handle AWS Cognito rate limiting more gracefully
        setError('Sign-in temporarily unavailable due to too many attempts. Please wait 15-30 minutes before trying again, or use "Forgot password?" to reset your password.');
      } else {
        setError(authError.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced forgot password flow
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      await amplifyResetPassword({
        username: resetEmail
      });
      setResetSuccess('Password reset code sent to your email. Please check your inbox and spam folder.');
      setResetStep('verify');
    } catch (err) {
      const authError = err as AuthError;
      
      // Enhanced error messages with actionable guidance
      if (authError.message.includes('Attempt limit exceeded') || authError.message.includes('Too many requests')) {
        setResetError('Too many password reset attempts. Please wait 1 hour before trying again. This helps protect your account security.');
      } else if (authError.message.includes('UserNotFoundException')) {
        setResetError('No account found with this email address. Please check your email or create a new account.');
      } else if (authError.message.includes('InvalidParameterException')) {
        setResetError('Please enter a valid email address.');
      } else if (authError.message.includes('LimitExceededException')) {
        setResetError('Too many requests. Please wait 15-30 minutes before trying again.');
      } else if (authError.message.includes('400') || authError.message.includes('Bad Request')) {
        setResetError('Password reset temporarily unavailable due to too many attempts. Please wait 1 hour before trying again.');
      } else {
        setResetError(authError.message || 'Failed to send reset code. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    
    // Enhanced password validation
    if (!isPasswordValid) {
      setResetError('Please ensure your password meets all requirements.');
      return;
    }
    
    setResetLoading(true);
    try {
      await amplifyConfirmResetPassword({
        username: resetEmail,
        confirmationCode: resetCode,
        newPassword: resetPassword
      });
      setResetSuccess('Password reset successful! You can now sign in with your new password.');
      setResetStep('request');
      setShowForgot(false);
      setEmail(resetEmail);
      setPassword('');
      setResetPassword('');
      setResetConfirmPassword('');
    } catch (err) {
      const authError = err as AuthError;
      
      // Enhanced error messages with recovery options
      if (authError.message.includes('CodeMismatchException')) {
        setResetError('Invalid verification code. Please check your email and enter the correct code.');
      } else if (authError.message.includes('ExpiredCodeException')) {
        setResetError('Verification code has expired. Please request a new code.');
      } else if (authError.message.includes('Attempt limit exceeded') || authError.message.includes('Too many requests')) {
        setResetError('Too many attempts. Please wait 15-30 minutes before trying again.');
      } else if (authError.message.includes('InvalidPasswordException')) {
        setResetError('Password does not meet requirements. Please ensure it has at least 8 characters, includes letters and numbers.');
      } else if (authError.message.includes('LimitExceededException')) {
        setResetError('Too many requests. Please wait a moment before trying again.');
      } else {
        setResetError(authError.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showForgot ? 'Reset your password' : 'Sign in to your account'}
          </h2>
          {!showForgot && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome back! Please sign in to continue.
            </p>
          )}
        </div>
        
        {!showForgot ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-describedby="email-error"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    aria-describedby="password-error"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
            </div>
            
            {error && (
              <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="polite">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors duration-200"
                onClick={() => {
                  setShowForgot(true);
                  setResetEmail(email);
                  setResetStep('request');
                  setResetError('');
                  setResetSuccess('');
                }}
              >
                Forgot password?
              </button>
              <Link
                to="/signup"
                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-semibold transition-colors duration-200"
              >
                Create account
              </Link>
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={resetStep === 'request' ? handleForgotRequest : handleForgotVerify}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="resetEmail"
                  name="resetEmail"
                  type="email"
                  autoComplete="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={resetStep === 'verify'}
                />
              </div>
              {resetStep === 'verify' && (
                <>
                  <div>
                    <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700">
                      Verification code
                    </label>
                    <input
                      id="resetCode"
                      name="resetCode"
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the 6-digit code sent to your email
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="resetPassword" className="block text-sm font-medium text-gray-700">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="resetPassword"
                        name="resetPassword"
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        onFocus={() => setShowPasswordRequirements(true)}
                        className={`mt-1 block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          resetPassword.length > 0 && !passwordValidation.length 
                            ? 'border-red-300' 
                            : 'border-gray-300'
                        }`}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                      >
                        {showResetPassword ? (
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Password Strength Meter */}
                    {resetPassword.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Password strength:</span>
                          <span className={`font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="resetConfirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        id="resetConfirmPassword"
                        name="resetConfirmPassword"
                        type={showResetConfirmPassword ? 'text' : 'password'}
                        required
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          resetConfirmPassword.length > 0 && !passwordValidation.match 
                            ? 'border-red-300' 
                            : 'border-gray-300'
                        }`}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        aria-label={showResetConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showResetConfirmPassword ? (
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Enhanced Password Requirements */}
                  {showPasswordRequirements && (
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Password Requirements:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className={`flex items-center ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordValidation.length ? '✓' : '○'}</span>
                          At least 8 characters
                        </div>
                        <div className={`flex items-center ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordValidation.hasUppercase ? '✓' : '○'}</span>
                          One uppercase letter
                        </div>
                        <div className={`flex items-center ${passwordValidation.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordValidation.hasLowercase ? '✓' : '○'}</span>
                          One lowercase letter
                        </div>
                        <div className={`flex items-center ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordValidation.hasNumber ? '✓' : '○'}</span>
                          One number
                        </div>
                        <div className={`flex items-center ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordValidation.hasSpecial ? '✓' : '○'}</span>
                          One special character
                        </div>
                        <div className={`flex items-center ${passwordValidation.match ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordValidation.match ? '✓' : '○'}</span>
                          Passwords match
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {resetError && (
              <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="polite">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{resetError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {resetSuccess && (
              <div className="rounded-md bg-green-50 p-4" role="alert" aria-live="polite">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{resetSuccess}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-6">
              <button
                type="button"
                className="flex items-center justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                onClick={() => setShowForgot(false)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to sign in
              </button>
              {resetStep === 'request' ? (
                <button
                  type="submit"
                  className="flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Sending code...' : 'Send reset code'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    onClick={() => {
                      setResetStep('request');
                      setResetCode('');
                      setResetPassword('');
                      setResetConfirmPassword('');
                      setResetError('');
                      setResetSuccess('');
                    }}
                  >
                    ↻ Resend code
                  </button>
                  <button
                    type="submit"
                    className="flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={resetLoading || !isPasswordValid}
                  >
                    {resetLoading ? 'Resetting password...' : 'Reset password'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignIn; 