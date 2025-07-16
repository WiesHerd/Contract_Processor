import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { 
  FileText, Users, FilePlus2, ClipboardList, LogOut, Zap, 
  Moon, Sun, Grid3X3, Layers, Sparkles,
  BarChart3, Shield, Workflow, Command, Gauge
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const mainFeatures = [
  {
    title: 'Templates',
    description: 'Design and manage contract templates with dynamic placeholders',
    icon: <FileText className="w-6 h-6" />,
    path: '/templates',
    gradient: 'from-blue-600 via-blue-500 to-cyan-500',
    stats: '12 active'
  },
  {
    title: 'Advanced Templates',
    description: 'Create intelligent conditional content with advanced logic',
    icon: <Zap className="w-6 h-6" />,
    path: '/dynamic-blocks',
    gradient: 'from-amber-600 via-amber-500 to-yellow-500',
    stats: '8 blocks'
  },
  {
    title: 'Providers',
    description: 'Centralized provider data management and bulk operations',
    icon: <Users className="w-6 h-6" />,
    path: '/providers',
    gradient: 'from-emerald-600 via-emerald-500 to-green-500',
    stats: '1,247 records'
  },
  {
    title: 'Generate',
    description: 'Automated contract generation with enterprise-grade processing',
    icon: <FilePlus2 className="w-6 h-6" />,
    path: '/generate',
    gradient: 'from-purple-600 via-purple-500 to-indigo-500',
    stats: '3,456 generated'
  }
];

const utilityFeatures = [
  {
    title: 'Field Mapping',
    description: 'Configure data field mappings',
    icon: <Workflow className="w-5 h-5" />,
    path: '/map-fields'
  },
  {
    title: 'Activity Log',
    description: 'Monitor system activity and audit trails',
    icon: <BarChart3 className="w-5 h-5" />,
    path: '/audit'
  },
  {
    title: 'Clauses',
    description: 'Manage contract clause library',
    icon: <Shield className="w-5 h-5" />,
    path: '/clauses'
  }
];

export const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { signOut, isAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/signin';
  };

  const themeClasses = isDark 
    ? 'bg-black text-white' 
    : 'bg-white text-gray-900';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-20"></div>
                  <div className={`relative p-2 rounded-lg ${isDark ? 'bg-gray-900' : 'bg-white'} border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    <Logo size={24} />
                  </div>
                </div>
                <div>
                  <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    ContractEngine
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Physician Contract Automation
                  </p>
                </div>
              </div>
              

            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => navigate('/instructions')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <Command className="w-4 h-4" />
                <span className="hidden sm:inline">Instructions</span>
              </button>
              
              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">


        {/* Main Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {mainFeatures.map((feature) => (
            <button
              key={feature.path}
              onClick={() => navigate(feature.path)}
              className={`group relative p-8 rounded-2xl border transition-all duration-300 text-left overflow-hidden ${
                isDark 
                  ? 'bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-800' 
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
              }`}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.gradient} text-white`}>
                  {feature.icon}
                </div>
              </div>
              
              {/* Content */}
              <div className="relative">
                <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={`text-base mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
                <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {feature.stats}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Utility Features */}
        <div className={`rounded-2xl border p-8 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Grid3X3 className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Utility Tools
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {utilityFeatures.map((feature) => (
              <button
                key={feature.path}
                onClick={() => navigate(feature.path)}
                className={`group p-6 rounded-xl border transition-all duration-200 text-left ${
                  isDark 
                    ? 'border-gray-800 hover:border-gray-700 hover:bg-gray-800' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors`}>
                    {feature.icon}
                  </div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {feature.title}
                  </h4>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 