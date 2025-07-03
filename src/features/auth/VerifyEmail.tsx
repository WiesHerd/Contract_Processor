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

    try {
      await confirmSignUp(email, trimmedCode);
      toast.success('Account verified successfully! Please sign in.');
      navigate('/signin');
    } catch (err: any) {
      if (err.name === 'CodeMismatchException') {
        setError('Invalid verification code. Please try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
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
      setSuccess('A new verification code has been sent to your email.');
    } catch (err: any) {
      if (err.name === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.');
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
            We sent a verification code to {email}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter verification code"
              />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          {success && <div className="text-green-500 text-sm text-center">{success}</div>}
          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendDisabled}
              className="text-blue-600 hover:underline text-sm text-center disabled:text-gray-400 disabled:no-underline"
            >
              {resendDisabled
                ? `Resend code in ${countdown}s`
                : 'Resend verification code'}
            </button>
            <Link
              to="/signin"
              className="text-blue-600 hover:underline text-sm text-center"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail; 