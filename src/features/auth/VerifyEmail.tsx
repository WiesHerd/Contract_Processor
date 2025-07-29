import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { resendSignUpCode } from 'aws-amplify/auth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmSignUp, signIn } = useAuth();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/signin');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const trimmedCode = code.trim();

    if (!email) {
      setError('An email address was not provided. Please sign up again.');
      setIsLoading(false);
      return;
    }

    if (!trimmedCode) {
      setError('Please enter your verification code.');
      setIsLoading(false);
      return;
    }

    if (trimmedCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      setIsLoading(false);
      return;
    }

    try {
      await confirmSignUp(email, trimmedCode);
      toast.success('Account verified successfully! Please sign in.');
      navigate('/signin');
    } catch (err: any) {
      if (err.name === 'CodeMismatchException') {
        setError('Invalid verification code. Please check your email and try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
      } else if (err.name === 'NotAuthorizedException') {
        setError('This account has already been verified. Please sign in.');
      } else if (err.name === 'LimitExceededException') {
        setError('Too many verification attempts. Please wait before trying again.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setResendDisabled(true);
    setCountdown(60); // 60 second cooldown

    try {
      await resendSignUpCode({ username: email });
      setSuccess('A new verification code has been sent to your email. Please check your inbox and spam folder.');
    } catch (err: any) {
      if (err.name === 'LimitExceededException') {
        setError('Too many resend attempts. Please try again later.');
      } else if (err.name === 'UserNotFoundException') {
        setError('Account not found. Please sign up again.');
      } else {
        setError(err.message || 'Failed to resend code. Please try again.');
      }
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  if (!email) {
    return null; // Prevent flash of content before redirect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We sent a verification code to <span className="font-medium text-gray-900">{email}</span>
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Check your inbox and spam folder for the 6-digit code
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="relative">
                <input
                  id="code"
                  name="code"
                  type={showCode ? 'text' : 'password'}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 6-digit code"
                  aria-describedby="code-error"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCode(!showCode)}
                  aria-label={showCode ? 'Hide code' : 'Show code'}
                >
                  {showCode ? (
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
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit code sent to your email
              </p>
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
          
          {success && (
            <div className="rounded-md bg-green-50 p-4" role="alert" aria-live="polite">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendDisabled}
              className="text-blue-600 hover:text-blue-800 hover:underline text-sm text-center disabled:text-gray-400 disabled:no-underline transition-colors duration-200"
            >
              {resendDisabled
                ? `Resend code in ${countdown}s`
                : 'Resend verification code'}
            </button>
            
            <Link
              to="/signin"
              className="text-blue-600 hover:text-blue-800 hover:underline text-sm text-center transition-colors duration-200"
            >
              Back to sign in
            </Link>
          </div>
          
          {/* Help Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Need help?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• Wait a few minutes for the email to arrive</li>
              <li>• Contact support if you continue having issues</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail; 