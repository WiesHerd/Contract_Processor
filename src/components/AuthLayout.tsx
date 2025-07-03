import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="absolute top-0 left-0 w-full p-4 sm:p-6">
        <Link to="/">
          <Logo size="small" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <Outlet />
      </main>
    </div>
  );
}; 