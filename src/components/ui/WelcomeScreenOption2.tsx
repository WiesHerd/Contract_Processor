import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import { 
  FileText, Users, FilePlus2, ClipboardList, LogOut, Zap, 
  ArrowRight, TrendingUp, Clock, CheckCircle, Settings,
  BarChart3, Shield, Workflow, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const workflowSteps = [
  {
    step: '01',
    title: 'Templates',
    description: 'Upload and configure contract templates',
    icon: <FileText className="w-5 h-5" />,
    path: '/templates',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    step: '02',
    title: 'Dynamic Blocks',
    description: 'Create conditional logic blocks',
    icon: <Sparkles className="w-5 h-5" />,
    path: '/dynamic-blocks',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    step: '03',
    title: 'Providers',
    description: 'Import and manage provider data',
    icon: <Users className="w-5 h-5" />,
    path: '/providers',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    step: '04',
    title: 'Generate',
    description: 'Automated contract generation',
    icon: <Zap className="w-5 h-5" />,
    path: '/generate',
    color: 'from-orange-500 to-red-500'
  }
];

const quickActions = [
  {
    title: 'Field Mapping',
    description: 'Configure placeholder mappings',
    icon: <Workflow className="w-5 h-5" />,
    path: '/map-fields',
    accent: 'border-l-4 border-l-blue-500'
  },
  {
    title: 'Activity Log',
    description: 'Monitor system activity',
    icon: <BarChart3 className="w-5 h-5" />,
    path: '/audit',
    accent: 'border-l-4 border-l-emerald-500'
  },
  {
    title: 'Clauses',
    description: 'Manage contract clauses',
    icon: <Shield className="w-5 h-5" />,
    path: '/clauses',
    accent: 'border-l-4 border-l-purple-500'
  }
];

const stats = [
  { label: 'Templates', value: '12', change: '+2 this week', icon: <FileText className="w-4 h-4" /> },
  { label: 'Providers', value: '1,247', change: '+89 this month', icon: <Users className="w-4 h-4" /> },
  { label: 'Generated', value: '3,456', change: '+234 today', icon: <CheckCircle className="w-4 h-4" /> },
  { label: 'Success Rate', value: '99.2%', change: '+0.3% this week', icon: <TrendingUp className="w-4 h-4" /> }
];

export const WelcomeScreenOption2 = () => {
  const navigate = useNavigate();
  const { signOut, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/signin';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Logo size={32} />
                <h1 className="text-xl font-semibold text-gray-900">ContractEngine</h1>
              </div>
              <div className="hidden md:flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Last updated: 2 minutes ago</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/instructions')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Instructions</span>
              </button>
              
              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Physician Contract Automation Platform</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome back to ContractEngine
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl">
            Streamline your contract generation workflow with our intelligent automation platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-500">
                  {stat.icon}
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-green-600">{stat.change}</div>
            </div>
          ))}
        </div>

        {/* Main Workflow */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-xl font-semibold text-gray-900">Contract Generation Workflow</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {workflowSteps.map((step, index) => (
              <div key={step.path} className="relative">
                <button
                  onClick={() => navigate(step.path)}
                  className="w-full group relative p-6 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${step.color} flex items-center justify-center text-white text-sm font-semibold`}>
                      {step.step}
                    </div>
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      {step.icon}
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-600 mb-4">{step.description}</p>
                  
                  <div className="flex items-center text-sm text-blue-600 group-hover:text-blue-700">
                    <span>Get started</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
                
                {index < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`p-6 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 text-left group ${action.accent}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    {action.icon}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">{action.title}</h4>
                </div>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 