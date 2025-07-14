import React, { useState } from 'react';
import { WelcomeScreen } from '../WelcomeScreen';
import { WelcomeScreenOption2 } from './WelcomeScreenOption2';
import { WelcomeScreenOption3 } from './WelcomeScreenOption3';
import { Eye, Palette, Monitor, Smartphone, Layout } from 'lucide-react';

const designOptions = [
  {
    id: 'option1',
    name: 'Notion-Inspired',
    description: 'Clean cards with gradients and modern spacing',
    component: WelcomeScreen,
    preview: 'Modern card-based layout with 2x2 grid for primary features'
  },
  {
    id: 'option2',
    name: 'Stripe-Inspired',
    description: 'Dashboard with workflow steps and stats',
    component: WelcomeScreenOption2,
    preview: 'Data-focused dashboard with workflow visualization'
  },
  {
    id: 'option3',
    name: 'Vercel/Linear-Inspired',
    description: 'Dark mode toggle with enterprise feel',
    component: WelcomeScreenOption3,
    preview: 'Modern dark/light theme with enterprise branding'
  }
];

export const WelcomeScreenDemo = () => {
  const [selectedOption, setSelectedOption] = useState('option1');
  const [viewMode, setViewMode] = useState('desktop');

  const SelectedComponent = designOptions.find(opt => opt.id === selectedOption)?.component || WelcomeScreen;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Panel */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Welcome Screen Design Options</h1>
              </div>
              
              <div className="flex items-center gap-2">
                {designOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedOption === option.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 rounded-lg ${viewMode === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 rounded-lg ${viewMode === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Design Description */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Layout className="w-4 h-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">
                {designOptions.find(opt => opt.id === selectedOption)?.name}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {designOptions.find(opt => opt.id === selectedOption)?.description}
            </p>
            <p className="text-xs text-gray-500">
              {designOptions.find(opt => opt.id === selectedOption)?.preview}
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={`${viewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'}`}>
        <div className={`${viewMode === 'mobile' ? 'border-x border-gray-300' : ''} min-h-screen`}>
          <SelectedComponent />
        </div>
      </div>
    </div>
  );
}; 