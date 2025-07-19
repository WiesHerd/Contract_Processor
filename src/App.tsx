import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './store';
import TemplateManager from './features/templates/TemplateManager';
import MappingListPage from './features/templates/MappingListPage';
import FieldMapperPage from './features/templates/FieldMapperPage';
import ProviderDataManager from './features/providers/ProviderDataManager';
import ContractGenerator from './features/generator/ContractGenerator';
import ClauseManager from './features/clauses/ClauseManager';
import AuditPage from './features/audit/AuditPage';
import { WelcomeScreen } from './components/WelcomeScreen';
import Logo from './components/Logo';
import InstructionsPage from './components/InstructionsPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { YearProvider } from './contexts/YearContext';
import SignIn from './features/auth/SignIn';
import SignUp from './features/auth/SignUp';
import VerifyEmail from './features/auth/VerifyEmail';
import { signOut } from 'aws-amplify/auth';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './features/admin/AdminDashboard';
import { Toaster, toast } from 'sonner';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { SessionTimeoutModal } from './components/ui/SessionTimeoutModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Avatar from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, BarChart3 } from 'lucide-react';
import ProfilePage from './features/auth/ProfilePage';
import PublicRoute from './components/PublicRoute';
import { AuthLayout } from './components/AuthLayout';
import { withErrorBoundary } from './components/ErrorBoundary';
import { ErrorHandlerProvider } from './components/ui/error-handler';
import { fetchMappingsIfNeeded } from '@/features/templates/mappingsSlice';
import { fetchProvidersIfNeeded } from '@/store/slices/providerSlice';
import { fetchTemplatesIfNeeded } from '@/features/templates/templatesSlice';
import { fetchClausesIfNeeded } from '@/store/slices/clauseSlice';
import { useAppDispatch } from './store';
import DynamicBlocksPage from './features/dynamic-blocks/DynamicBlocksPage';
import { WelcomeScreenDemo } from './components/ui/WelcomeScreenDemo';
import { YearSelector } from './components/YearSelector';

function AppInitializer() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchMappingsIfNeeded());
    dispatch(fetchProvidersIfNeeded());
    dispatch(fetchTemplatesIfNeeded());
    dispatch(fetchClausesIfNeeded());
  }, [dispatch]);
  return null;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isWelcome = location.pathname === '/';
  
  const navigate = useNavigate();
  const { isAuthenticated, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/signin'; // Hard reload for bulletproof session clear
    } catch (error) {
      window.location.href = '/signin';
    }
  };

  const { isWarningModalOpen, countdown, handleStayLoggedIn } = useSessionTimeout(
    isAuthenticated ? handleSignOut : () => {},
    { isAdmin: isAdmin }
  );

  // This check ensures TopNav does not appear on the welcome screen,
  // but will appear on all other protected routes.
  const showNav = location.pathname !== '/';

  // Banner state for enterprise-grade UX
  const [showSessionBanner, setShowSessionBanner] = useState(false);

  useEffect(() => {
    // Only show the banner if not already shown this session
    if (isAuthenticated && !isWarningModalOpen && !sessionStorage.getItem('sessionBannerShown')) {
      setShowSessionBanner(true);
      sessionStorage.setItem('sessionBannerShown', 'true');
      // Auto-dismiss after 8 seconds
      const timer: number = window.setTimeout(() => setShowSessionBanner(false), 8000);
      return () => clearTimeout(timer);
    }
    // Hide banner if modal is open
    if (isWarningModalOpen) setShowSessionBanner(false);
  }, [isAuthenticated, isWarningModalOpen]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showNav && <TopNav onSignOut={handleSignOut} />}
      {/* Enterprise-grade: Session timeout banner auto-dismisses and only shows once per session */}
      {isAuthenticated && showSessionBanner && (
        <div
          className="w-full bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-center py-2 text-sm font-medium z-20 transition-opacity duration-700 opacity-100"
          style={{ position: 'fixed', top: showNav ? 0 : undefined, left: 0 }}
        >
          For your security, you will be logged out after 20 minutes of inactivity.
        </div>
      )}
      <main className={`flex-1 max-w-7xl mx-auto px-4 py-8 w-full ${showNav ? 'pt-20' : ''}`}>
        {children}
      </main>
      <footer className="w-full py-4 px-6 border-t border-gray-200 bg-white">
        <div className="container mx-auto text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ContractEngine. All rights reserved.
        </div>
      </footer>
      {isAuthenticated && (
        <SessionTimeoutModal
          isOpen={isWarningModalOpen}
          countdown={countdown}
          onStay={handleStayLoggedIn}
          onSignOut={handleSignOut}
          customMessage="For your security, you will be automatically logged out after a period of inactivity. Please click 'Stay Signed In' to continue your session."
        />
      )}
    </div>
  );
}

function UserNav({ onSignOut }: { onSignOut: () => void }) {
  const { user, isAdmin, attributes } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const getInitials = (firstName?: string, username?: string) => {
    if (firstName) return firstName.charAt(0).toUpperCase();
    if (username) return username.charAt(0).toUpperCase();
    return '?';
  };

  const userInitial = getInitials(attributes?.given_name, user.username);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Avatar initial={userInitial} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {attributes?.given_name && attributes?.family_name
                ? `${attributes.given_name} ${attributes.family_name}`
                : user.username}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {attributes?.email || 'No email provided'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isAdmin && (
            <DropdownMenuItem onClick={() => navigate('/admin')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/audit')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Activity Log</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopNav({ onSignOut }: { onSignOut: () => void }) {
  const location = useLocation();
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

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
      title: 'Dynamic Blocks',
      path: '/dynamic-blocks',
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
      group: 'setup'
    },
    {
      title: 'Generate',
      path: '/generate',
      group: 'action'
    }
  ];

  const groupedNav = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  const groupOrder = ['setup', 'action'];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <Logo size={32} />
            </Link>
            {isAuthenticated && (
              <div className="hidden sm:ml-6 sm:flex items-center space-x-4">
                {groupOrder.map((group) => {
                  if (!groupedNav[group]) return null;
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
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated && <YearSelector />}
            {isLoading ? null : !isAuthenticated ? (
              <Link
                to="/signin"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md border border-blue-100 hover:border-blue-300 transition"
              >
                Sign In
              </Link>
            ) : (
              <UserNav onSignOut={onSignOut} />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppInitializer />
      <ErrorHandlerProvider>
      <AuthProvider>
        <YearProvider>
          <Router>
            <Toaster position="top-right" richColors />
            <Routes>
              {/* Public routes with the new minimal layout */}
              <Route element={<AuthLayout />}>
                <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
                <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
              </Route>

              {/* Protected routes with the full application layout */}
              <Route element={<AppLayout><Outlet /></AppLayout>}>
                <Route path="/" element={<ProtectedRoute><WelcomeScreen /></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><TemplateManager /></ProtectedRoute>} />
                <Route path="/map-fields" element={<ProtectedRoute><MappingListPage /></ProtectedRoute>} />
                <Route path="/map-fields/:templateId" element={<ProtectedRoute><FieldMapperPage /></ProtectedRoute>} />
                <Route path="/providers" element={<ProtectedRoute><ProviderDataManager /></ProtectedRoute>} />
                <Route path="/generate" element={<ProtectedRoute><ContractGenerator /></ProtectedRoute>} />
                <Route path="/clauses" element={<ProtectedRoute><ClauseManager /></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
                <Route path="/instructions" element={<ProtectedRoute><InstructionsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                                <Route path="/dynamic-blocks" element={<ProtectedRoute><DynamicBlocksPage /></ProtectedRoute>} />
                  <Route path="/welcome-demo" element={<ProtectedRoute><WelcomeScreenDemo /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              </Route>
            </Routes>
          </Router>
        </YearProvider>
      </AuthProvider>
      </ErrorHandlerProvider>
    </Provider>
  );
}

// Export with error boundary wrapper
export default withErrorBoundary(App); 