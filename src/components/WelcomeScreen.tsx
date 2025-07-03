import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
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
    title: 'Audit',
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
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center mb-12">
          <Logo size="large" />
          <p className="text-lg text-gray-600 max-w-2xl text-center mt-6">
            Streamline your provider contract management with our intelligent automation platform.
          </p>
          <button
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold text-lg"
            onClick={() => navigate('/instructions')}
          >
            Instructions
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {card.title}
              </h2>
              <p className="text-gray-600">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}; 