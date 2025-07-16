import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Users, FilePlus2, BarChart3, ArrowRight, 
  Upload, Download, Search, Filter, Shield, Zap,
  CheckCircle, AlertCircle, Info, Play, Settings,
  BookOpen, Target, Database, Workflow, Command
} from 'lucide-react';

const InstructionsPage: React.FC = () => {
  const navigate = useNavigate();

  const workflowSteps = [
    {
      step: 1,
      title: 'Templates',
      description: 'Design and manage contract templates with dynamic placeholders',
      icon: <FileText className="w-6 h-6" />,
      path: '/templates',
      gradient: 'from-blue-600 to-cyan-500',
      details: [
        'Upload DOCX files or use the built-in editor',
        'Use {{placeholders}} for dynamic fields (e.g., {{ProviderName}}, {{StartDate}})',
        'Configure conditional clauses and logic',
        'Version control and template management'
      ],
      tips: [
        'Start with a base template and customize for different compensation models',
        'Use descriptive placeholder names for better organization',
        'Test templates with sample data before production use'
      ]
    },
    {
      step: 2,
      title: 'Dynamic Blocks',
      description: 'Create intelligent conditional content with advanced logic',
      icon: <Zap className="w-6 h-6" />,
      path: '/dynamic-blocks',
      gradient: 'from-purple-600 to-indigo-500',
      details: [
        'Build complex conditional content blocks',
        'Generate dynamic tables, lists, and summaries',
        'Create compensation breakdowns and performance metrics',
        'Advanced logic for different provider types and models'
      ],
      tips: [
        'Use dynamic blocks for complex compensation structures',
        'Create reusable blocks for common contract sections',
        'Test blocks with various provider data scenarios'
      ]
    },
    {
      step: 3,
      title: 'Providers',
      description: 'Upload and manage provider data with bulk operations',
      icon: <Users className="w-6 h-6" />,
      path: '/providers',
      gradient: 'from-emerald-600 to-green-500',
      details: [
        'Upload CSV files with provider information',
        'Manual entry and bulk editing capabilities',
        'Automatic template matching based on provider data',
        'Data validation and error handling'
      ],
      tips: [
        'Ensure CSV headers match your template placeholders',
        'Use consistent data formats for dates and numbers',
        'Review provider data before template assignment'
      ]
    },
    {
      step: 4,
      title: 'Field Mapping',
      description: 'Configure data field mappings and validation rules',
      icon: <Workflow className="w-6 h-6" />,
      path: '/map-fields',
      gradient: 'from-orange-600 to-red-500',
      details: [
        'Map provider data fields to template placeholders',
        'Set validation rules and required fields',
        'Configure data transformations and formatting',
        'Handle missing or invalid data gracefully'
      ],
      tips: [
        'Map all required template placeholders to data fields',
        'Set appropriate validation rules for critical fields',
        'Test mappings with sample data'
      ]
    },
    {
      step: 5,
      title: 'Generate',
      description: 'Automated contract generation with enterprise processing',
      icon: <FilePlus2 className="w-6 h-6" />,
      path: '/generate',
      gradient: 'from-amber-600 to-orange-500',
      details: [
        'Single or bulk contract generation',
        'DOCX and PDF output formats',
        'ZIP archive downloads for bulk operations',
        'Real-time progress tracking and notifications'
      ],
      tips: [
        'Review generated contracts before distribution',
        'Use bulk generation for large provider sets',
        'Monitor the activity log for any issues'
      ]
    },
    {
      step: 6,
      title: 'Activity Log',
      description: 'Monitor system activity and compliance audit trails',
      icon: <BarChart3 className="w-6 h-6" />,
      path: '/audit',
      gradient: 'from-red-600 to-pink-500',
      details: [
        'FMV override logs and justifications',
        'Contract generation metadata and timestamps',
        'User activity tracking and audit trails',
        'Compliance reporting and export capabilities'
      ],
      tips: [
        'Regularly review FMV warnings and overrides',
        'Export audit logs for compliance reporting',
        'Monitor system usage patterns'
      ]
    }
  ];

  const quickActions = [
    {
      title: 'Upload Template',
      description: 'Start with a DOCX template',
      icon: <Upload className="w-5 h-5" />,
      path: '/templates',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      title: 'Create Dynamic Blocks',
      description: 'Build intelligent content blocks',
      icon: <Zap className="w-5 h-5" />,
      path: '/dynamic-blocks',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      title: 'Import Providers',
      description: 'Upload CSV provider data',
      icon: <Database className="w-5 h-5" />,
      path: '/providers',
      color: 'text-emerald-600 bg-emerald-50'
    },
    {
      title: 'Generate Contracts',
      description: 'Create contracts now',
      icon: <Play className="w-5 h-5" />,
      path: '/generate',
      color: 'text-amber-600 bg-amber-50'
    }
  ];

  const bestPractices = [
    {
      title: 'Template Design',
      icon: <FileText className="w-5 h-5" />,
      items: [
        'Use clear, descriptive placeholder names',
        'Include conditional logic for different compensation models',
        'Test templates with various data scenarios',
        'Maintain version control for template updates'
      ]
    },
    {
      title: 'Data Management',
      icon: <Database className="w-5 h-5" />,
      items: [
        'Validate provider data before template assignment',
        'Use consistent data formats across all providers',
        'Regularly backup and export provider data',
        'Monitor data quality and completeness'
      ]
    },
    {
      title: 'Generation Process',
      icon: <Zap className="w-5 h-5" />,
      items: [
        'Review generated contracts for accuracy',
        'Use bulk operations for efficiency',
        'Monitor system performance during large batches',
        'Keep audit logs for compliance purposes'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Getting Started Guide
              </h1>
              <p className="text-gray-600">
                Learn how to use ContractEngine to automate your physician contract generation process
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Command className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{action.description}</p>
                <div className="flex items-center gap-1 mt-3 text-blue-600 text-sm font-medium">
                  Get Started <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Complete Workflow</h2>
          <div className="space-y-8">
            {workflowSteps.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Connection Line */}
                {index < workflowSteps.length - 1 && (
                  <div className="absolute left-8 top-16 w-0.5 h-8 bg-gray-200"></div>
                )}
                
                <div className="flex gap-6">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${step.gradient} text-white flex items-center justify-center font-bold text-lg shadow-lg`}>
                      {step.step}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${step.gradient} text-white`}>
                          {step.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                          <p className="text-gray-600">{step.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(step.path)}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Open <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Key Features */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Key Features
                        </h4>
                        <ul className="space-y-2">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Pro Tips */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          Pro Tips
                        </h4>
                        <ul className="space-y-2">
                          {step.tips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Blocks Features */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Dynamic Blocks Features</h2>
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Zap className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">What are Dynamic Blocks?</h3>
                <p className="text-purple-800 text-sm">
                  Dynamic Blocks are intelligent content generators that create complex contract sections based on provider data and conditions. 
                  They go beyond simple placeholders to generate entire tables, lists, summaries, and conditional content.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Output Types
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Compensation Summary Tables</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Performance Metrics Lists</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Call Schedule Breakdowns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Department Summaries</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Compliance Checklists</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Timeline Trackers</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Advanced Features
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Conditional logic based on provider data</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Automatic calculation of compensation metrics</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Dynamic table generation with proper formatting</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Reusable blocks across multiple templates</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Version control and block management</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Integration with template placeholders</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Best Practices</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {bestPractices.map((practice) => (
              <div key={practice.title} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                    {practice.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900">{practice.title}</h3>
                </div>
                <ul className="space-y-2">
                  {practice.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Important Notes</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  All required placeholders must be resolved before exporting a contract
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  Use the clause system in templates for conditional or dynamic contract sections
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  Check the activity log regularly for FMV warnings and justifications
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  Use search and filter features in each section to quickly find templates, providers, or contracts
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsPage; 