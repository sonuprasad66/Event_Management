import { Calendar, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui/Button';

export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Intentionally ignored.
    }

    clearAuth();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/events" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
          <Calendar className="h-6 w-6" />
          EventHub
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/events/create">
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  New Event
                </Button>
              </Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<LayoutDashboard className="h-4 w-4" />}
                  >
                    Admin
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <p className="text-xs capitalize text-gray-500">{user.role.toLowerCase()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
