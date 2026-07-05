import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { Badge } from '../../components/ui/Badge';
import { Loader } from '../../components/ui/Loader';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(),
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events-recent'],
    queryFn: () => adminApi.events({ limit: '5', sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const stats = statsData?.data.data;
  const events = eventsData?.data.data || [];

  const statusBadge = (status?: string) => {
    if (status === 'published') {
      return <Badge variant="success">Published</Badge>;
    }
    if (status === 'waiting') {
      return <Badge variant="warning">Waiting</Badge>;
    }
    if (status === 'deleted') {
      return <Badge variant="danger">Deleted</Badge>;
    }
    return <Badge>Unknown</Badge>;
  };

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Overview of your event management portal</p>
      </div>

      {statsLoading ? (
        <Loader />
      ) : (
        stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title="Total Events" value={stats.total} icon={Calendar} color="bg-indigo-600" />
            <StatCard title="Published" value={stats.published} icon={CheckCircle} color="bg-green-600" />
            <StatCard title="Waiting" value={stats.waiting} icon={Clock} color="bg-amber-500" />
            <StatCard title="Deleted" value={stats.deleted} icon={Trash2} color="bg-red-500" />
            <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="bg-purple-600" />
          </div>
        )
      )}

      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
          <Link to="/admin/events" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </Link>
        </div>
        {eventsLoading ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Creator</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="max-w-xs truncate px-6 py-4 font-medium text-gray-900">
                      {event.title}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{event.createdBy?.username || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{event.category?.name || '—'}</td>
                    <td className="px-6 py-4">{statusBadge(event.status)}</td>
                    <td className="px-6 py-4">
                      <Link
                        to="/admin/events"
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
