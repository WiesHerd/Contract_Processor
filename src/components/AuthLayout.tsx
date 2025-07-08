import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Logo from '@/components/Logo';

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="absolute top-0 left-0 w-full p-4 sm:p-6 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-bold text-xl text-gray-900 tracking-tight">ContractEngine</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <Outlet />
      </main>
    </div>
  );
}; 