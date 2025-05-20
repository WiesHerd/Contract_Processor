import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import TemplateManager from './features/templates/TemplateManager';
import { FileText, Users, FilePlus2, ClipboardList } from 'lucide-react';
import React from 'react';

// Placeholder components
const ProvidersPage = () => <div className="p-4">Provider Data Manager</div>;
const GeneratePage = () => <div className="p-4">Contract Generator</div>;
const AuditPage = () => <div className="p-4">Audit Log</div>;

const navLinks = [
  { to: '/templates', label: 'Templates', icon: <FileText className="w-5 h-5 mr-2" /> },
  { to: '/providers', label: 'Providers', icon: <Users className="w-5 h-5 mr-2" /> },
  { to: '/generate', label: 'Generate', icon: <FilePlus2 className="w-5 h-5 mr-2" /> },
  { to: '/audit', label: 'Audit', icon: <ClipboardList className="w-5 h-5 mr-2" /> },
];

function Sidebar() {
  const location = useLocation();
  return (
    <aside className="h-screen w-64 bg-white border-r flex flex-col fixed top-0 left-0 z-20">
      <div className="h-16 flex items-center justify-center border-b">
        <span className="text-2xl font-bold tracking-tight">ContractEngine</span>
      </div>
      <nav className="flex-1 py-6 px-2 space-y-2">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center px-4 py-2 rounded-lg text-base font-medium transition-colors ${location.pathname === link.to ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 text-xs text-gray-400 text-center border-t">&copy; {new Date().getFullYear()} ContractEngine</div>
    </aside>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/templates" element={<TemplateManager />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/" element={<TemplateManager />} />
          </Routes>
        </AppLayout>
      </Router>
    </Provider>
  );
}

export default App; 