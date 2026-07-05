import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { categoriesApi } from '../api/categories';
import { eventsApi } from '../api/events';
import { EventCard } from '../components/events/EventCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Loader } from '../components/ui/Loader';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';

export function EventsPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('publishAtUtc');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const params = {
    page: String(page),
    limit: '9',
    ...(search && { search }),
    ...(categoryId && { categoryId }),
    sortBy,
    sortOrder,
  };

  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.list(params),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: '100' }),
  });

  const events = eventsData?.data.data || [];
  const pagination = eventsData?.data.pagination;
  const categories = categoriesData?.data.data || [];

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const sortOptions = [
    { value: 'publishAtUtc', label: 'Publish Date' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'title', label: 'Title' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upcoming Events</h1>
          <p className="mt-2 text-gray-500">
            Discover and explore events happening around you
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-48 flex-1">
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-48">
              <Select
                options={categoryOptions}
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
                placeholder="All Categories"
              />
            </div>
            <div className="w-40">
              <Select options={sortOptions} value={sortBy} onChange={(event) => setSortBy(event.target.value)} />
            </div>
            <Button
              variant="outline"
              size="md"
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Loader text="Loading events..." />
        ) : error ? (
          <EmptyState title="Failed to load events" description="Please try again later." />
        ) : events.length === 0 ? (
          <EmptyState title="No events found" description="Try adjusting your search or filters." />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {pagination && (
              <div className="mt-8">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
