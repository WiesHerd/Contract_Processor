import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  signIn, 
  fetchAuthSession, 
  resetPassword as amplifyResetPassword, 
  confirmResetPassword as amplifyConfirmResetPassword
} from 'aws-amplify/auth';

type AuthError = {
  name: string;
  message: string;
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
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // On mount, check if already signed in
    fetchAuthSession()
      .then((session) => {
        if (session && session.tokens?.idToken) {
          navigate('/');
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      if (isSignedIn) {
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/');
      } else if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        navigate('/verify-email', { state: { email } });
      }
    } catch (err) {
      const authError = err as AuthError;
      // Enterprise-grade error handling
      if (authError.name === 'UserNotFoundException') {
        setError('No account found with this email.');
      } else if (authError.name === 'NotAuthorizedException') {
        setError('Incorrect email or password.');
      } else if (authError.name === 'UserNotConfirmedException') {
        setError('Account not confirmed. Please check your email for a verification link.');
      } else if (authError.name === 'PasswordResetRequiredException') {
        setError('Password reset required. Please use the "Forgot password?" link.');
      } else {
        setError(authError.message ?? 'Sign in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password flow
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);
    try {
      await amplifyResetPassword({
        username: resetEmail
      });
      setResetStep('verify');
      setResetSuccess('A verification code has been sent to your email.');
    } catch (err) {
      const authError = err as AuthError;
      if (authError.name === 'UserNotFoundException') {
        setResetError('No account found with this email.');
      } else {
        setResetError(authError.message ?? 'Failed to send reset code.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);
    try {
      await amplifyConfirmResetPassword({
        username: resetEmail,
        confirmationCode: resetCode,
        newPassword: resetPassword
      });
      setResetSuccess('Password reset successful! You can now sign in.');
      setResetStep('request');
      setShowForgot(false);
      setEmail(resetEmail);
      setPassword('');
    } catch (err) {
      const authError = err as AuthError;
      if (authError.name === 'CodeMismatchException') {
        setResetError('Invalid verification code.');
      } else if (authError.name === 'ExpiredCodeException') {
        setResetError('Verification code expired. Please request a new one.');
      } else {
        setResetError(authError.message ?? 'Failed to reset password.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
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
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                className="text-blue-600 hover:underline text-sm"
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
                className="text-blue-600 hover:underline text-sm font-semibold"
              >
                Create account
              </Link>
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
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
                    />
                  </div>
                  <div>
                    <label htmlFor="resetPassword" className="block text-sm font-medium text-gray-700">
                      New password
                    </label>
                    <input
                      id="resetPassword"
                      name="resetPassword"
                      type="password"
                      required
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
            {resetError && <div className="text-red-500 text-sm text-center">{resetError}</div>}
            {resetSuccess && <div className="text-green-600 text-sm text-center">{resetSuccess}</div>}
            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                className="text-gray-600 hover:underline text-sm"
                onClick={() => setShowForgot(false)}
              >
                Back to sign in
              </button>
              {resetStep === 'verify' && (
                <button
                  type="button"
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => {
                    setResetStep('request');
                    setResetCode('');
                    setResetPassword('');
                    setResetError('');
                    setResetSuccess('');
                  }}
                >
                  Resend code
                </button>
              )}
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
                disabled={resetLoading}
              >
                {resetLoading
                  ? resetStep === 'request'
                    ? 'Sending code...'
                    : 'Resetting password...'
                  : resetStep === 'request'
                  ? 'Send reset code'
                  : 'Reset password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignIn; 