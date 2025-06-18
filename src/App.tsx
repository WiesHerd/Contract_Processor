import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import TemplateManager from './features/templates/TemplateManager';
import MappingListPage from './features/templates/MappingListPage';
import FieldMapperPage from './features/templates/FieldMapperPage';
import ProviderDataManager from './features/providers/ProviderDataManager';
import ContractGenerator from './features/generator/ContractGenerator';
import ClauseManager from './features/templates/ClauseManager';
import AuditPage from './features/audit/AuditPage';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Logo } from './components/Logo';
import InstructionsPage from './components/InstructionsPage';
import { AuthProvider } from './contexts/AuthContext';
import { ProvidersPage } from './features/providers/pages/providers-page';

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isWelcome = location.pathname === '/';
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isWelcome && <TopNav />}
      <main className={`flex-1 max-w-7xl mx-auto px-4 py-8 w-full ${!isWelcome ? 'pt-20' : ''}`}>
        {children}
      </main>
      <footer className="w-full py-4 px-6 border-t border-gray-200 bg-white">
        <div className="container mx-auto text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ContractEngine. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function TopNav() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      title: 'Templates',
      path: '/templates',
      group: 'setup'
    },
    {
      title: 'Providers',
      path: '/providers',
      group: 'setup'
    },
    {
      title: 'Mapping',
      path: '/map-fields',
      group: 'setup'
    },
    {
      title: 'Clauses',
      path: '/clauses',
      group: 'content'
    },
    {
      title: 'Generate',
      path: '/generate',
      group: 'action'
    },
    {
      title: 'Audit',
      path: '/audit',
      group: 'review'
    }
  ];

  // Group navItems by group
  const groupedNav = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  const groupOrder = ['setup', 'content', 'action', 'review'];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <Logo size="small" />
            </Link>
            <div className="hidden sm:ml-6 sm:flex items-center space-x-4">
              {groupOrder.map((group) => {
                if (!groupedNav[group]) return null;
                // For the 'setup' group, add vertical lines only before the first and after the last item
                if (group === 'setup') {
                  return (
                    <div key={group} className="flex items-center px-3 py-1">
                      <div className="h-6 w-px bg-gray-200 mr-3" />
                      {groupedNav[group].map((item, idx) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium ${
                            isActive(item.path)
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {item.title}
                        </Link>
                      ))}
                      <div className="h-6 w-px bg-gray-200 ml-3" />
                    </div>
                  );
                }
                // Default for other groups
                return (
                  <div key={group} className="flex items-center space-x-2 px-3 py-1">
                    {groupedNav[group].map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                          isActive(item.path)
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <PersistGate loading={null} persistor={persistor}>
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<WelcomeScreen />} />
                <Route path="/templates" element={<TemplateManager />} />
                <Route path="/map-fields" element={<MappingListPage />} />
                <Route path="/map-fields/:templateId" element={<FieldMapperPage />} />
                <Route path="/providers" element={<ProviderDataManager />} />
                <Route path="/generate" element={<ContractGenerator />} />
                <Route path="/clauses" element={<ClauseManager />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/instructions" element={<InstructionsPage />} />
              </Routes>
            </AppLayout>
          </Router>
        </PersistGate>
      </AuthProvider>
    </Provider>
  );
}

export default App; 