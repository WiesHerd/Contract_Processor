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
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <Logo size="small" />
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/templates" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Templates
              </Link>
              <Link to="/providers" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Providers
              </Link>
              <Link to="/generate" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Generate
              </Link>
              <Link to="/map-fields" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Mapping
              </Link>
              <Link to="/clauses" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Clauses
              </Link>
              <Link to="/audit" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300">
                Audit
              </Link>
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