import { useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { AdminSidebar } from './components/layout/AdminSidebar';
import { Navbar } from './components/layout/Navbar';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { useSocket } from './hooks/useSocket';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventsPage } from './pages/EventsPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuthStore } from './store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {children}
    </div>
  );
}

function AppContent() {
  const [forceLogoutMsg, setForceLogoutMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);

  const handleForceLogout = useCallback((data: { message: string; reason: string }) => {
    setForceLogoutMsg(data.message || data.reason || 'Your session has expired.');
  }, []);

  useSocket(handleForceLogout);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/events"
          element={
            <PublicLayout>
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            </PublicLayout>
          }
        />
        <Route
          path="/events/:id"
          element={
            <PublicLayout>
              <ProtectedRoute>
                <EventDetailPage />
              </ProtectedRoute>
            </PublicLayout>
          }
        />
        <Route
          path="/events/create"
          element={
            <PublicLayout>
              <ProtectedRoute>
                <CreateEventPage />
              </ProtectedRoute>
            </PublicLayout>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminDashboardPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminEventsPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminCategoriesPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminUsersPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to={token ? '/events' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Modal isOpen={Boolean(forceLogoutMsg)} title="Session Expired">
        <div className="space-y-4">
          <p className="text-gray-600">{forceLogoutMsg}</p>
          <Button
            className="w-full"
            onClick={() => {
              setForceLogoutMsg(null);
              navigate('/login');
            }}
          >
            Go to Login
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
