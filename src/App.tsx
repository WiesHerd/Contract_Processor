import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import TemplateManager from '@/features/templates/TemplateManager';
import ProviderDataManager from '@/features/providers/ProviderDataManager';
import ContractGenerator from '@/features/generator/ContractGenerator';
import { FileText, Users, FilePlus2, ClipboardList } from 'lucide-react';
import React from 'react';
import FieldMapperPage from '@/features/templates/FieldMapperPage';
import MappingListPage from '@/features/templates/MappingListPage';

// Placeholder components
const AuditPage = () => <div className="p-4">Audit Log</div>;

const navLinks = [
  { to: '/templates', label: 'Templates', icon: <FileText className="w-5 h-5 mr-2" /> },
  { to: '/map-fields', label: 'Mapping', icon: <ClipboardList className="w-5 h-5 mr-2" /> },
  { to: '/providers', label: 'Providers', icon: <Users className="w-5 h-5 mr-2" /> },
  { to: '/generate', label: 'Generate', icon: <FilePlus2 className="w-5 h-5 mr-2" /> },
  { to: '/audit', label: 'Audit', icon: <ClipboardList className="w-5 h-5 mr-2" /> },
];

function TopNav() {
  const location = useLocation();
  return (
    <nav className="w-full flex items-center gap-2 bg-white border-b px-6 py-3 shadow-sm">
      {navLinks.map(link => (
        <Link
          key={link.to}
          to={link.to}
          className={`flex items-center px-4 py-2 rounded-lg text-base font-medium transition-colors ${
            location.pathname === link.to
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {link.icon}
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-7xl mx-auto p-8">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/templates" element={<TemplateManager />} />
              <Route path="/map-fields" element={<MappingListPage />} />
              <Route path="/map-fields/:templateId" element={<FieldMapperPage />} />
              <Route path="/providers" element={<ProviderDataManager />} />
              <Route path="/generate" element={<ContractGenerator />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/" element={<TemplateManager />} />
            </Routes>
          </AppLayout>
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App; 