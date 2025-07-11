import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner 
          size="md" 
          message="Loading..." 
          color="primary"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. Admin privileges are required.
          </p>
          <p className="text-sm text-gray-500">
            Contact your system administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 