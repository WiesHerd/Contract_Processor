import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { FileText, Users, FilePlus2, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigationCards = [
  {
    title: 'Templates',
    description: 'Manage and create contract templates',
    icon: <FileText className="w-6 h-6" />,
    path: '/templates',
    color: 'border-t-4 border-blue-500',
    iconColor: 'text-blue-600',
    bg: 'hover:bg-blue-50'
  },
  {
    title: 'Providers',
    description: 'Manage provider information',
    icon: <Users className="w-6 h-6" />,
    path: '/providers',
    color: 'border-t-4 border-green-500',
    iconColor: 'text-green-600',
    bg: 'hover:bg-green-50'
  },
  {
    title: 'Generate',
    description: 'Generate new contracts',
    icon: <FilePlus2 className="w-6 h-6" />,
    path: '/generate',
    color: 'border-t-4 border-purple-500',
    iconColor: 'text-purple-600',
    bg: 'hover:bg-purple-50'
  },
  {
    title: 'Mapping',
    description: 'Map fields and placeholders',
    icon: <ClipboardList className="w-6 h-6" />,
    path: '/map-fields',
    color: 'border-t-4 border-orange-500',
    iconColor: 'text-orange-600',
    bg: 'hover:bg-orange-50'
  },
  {
    title: 'Activity Log',
    description: 'View FMV override logs and metadata',
    icon: <ClipboardList className="w-6 h-6" />,
    path: '/audit',
    color: 'border-t-4 border-gray-400',
    iconColor: 'text-gray-600',
    bg: 'hover:bg-gray-50'
  },
  {
    title: 'Clauses',
    description: 'Manage contract clauses and templates',
    icon: <FileText className="w-6 h-6" />,
    path: '/clauses',
    color: 'border-t-4 border-indigo-500',
    iconColor: 'text-indigo-600',
    bg: 'hover:bg-indigo-50'
  }
];

export const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { signOut, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/signin';
  };

  return (
    <div className="bg-white relative">
      {/* Log Out button in top-right */}
      {isAuthenticated && (
        <button
          onClick={handleSignOut}
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-red-100 hover:text-red-700 transition font-medium"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      )}
      {/* Instructions button on the top left */}
      <button
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold"
        onClick={() => navigate('/instructions')}
      >
        Instructions
      </button>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Title and Tagline with Branding */}
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="min-h-[72px] flex items-center justify-center">
            <Logo size={56} />
          </div>
          <h1
            className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-800 via-purple-700 to-indigo-800 drop-shadow-lg mt-5 mb-3 text-center"
            style={{ letterSpacing: '-0.02em', paddingTop: '0.25em', paddingBottom: '0.25em' }}
          >
            Welcome to ContractEngine
          </h1>
          <p className="text-lg text-gray-600 font-medium text-center max-w-2xl">
            Automate provider contracts with confidence and efficiency.
          </p>
        </div>
        {/* Subtle background accent */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="w-2/3 h-64 bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-full blur-2xl opacity-60 mx-auto mt-12" />
        </div>
        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          {navigationCards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className={`relative p-6 rounded-xl border border-gray-200 bg-white ${card.color} ${card.bg} shadow-sm transition-all duration-200 text-left group focus:outline-none focus:ring-2 focus:ring-blue-400 transform hover:scale-105`}
              style={{ minHeight: '160px' }}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-125 group-hover:-translate-y-1 ${card.iconColor}`}>
                {card.icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {card.title}
              </h2>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}; 