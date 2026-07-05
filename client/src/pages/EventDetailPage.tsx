import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Globe, Tag, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { eventsApi } from '../api/events';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedImage, setSelectedImage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id ?? ''),
    enabled: Boolean(id),
  });

  const event = data?.data.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Loader text="Loading event..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Event Not Found</h2>
          <p className="mb-4 text-gray-500">
            This event may not exist or hasn&apos;t been published yet.
          </p>
          <Link to="/events">
            <Button variant="outline">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = event.publishAtLocal
    ? new Date(event.publishAtLocal).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(event.publishAtUtc).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/events"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {event.media && event.media.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-2xl">
            <div className="aspect-video bg-gray-900">
              <img
                src={event.media[selectedImage].url}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            </div>
            {event.media.length > 1 && (
              <div className="flex gap-2 bg-gray-100 p-3">
                {event.media.map((media, index) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                      index === selectedImage ? 'border-indigo-500' : 'border-transparent'
                    }`}
                  >
                    <img src={media.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {event.category && <Badge variant="info">{event.category.name}</Badge>}
          </div>

          <h1 className="mb-6 text-3xl font-bold text-gray-900">{event.title}</h1>

          <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Published</p>
                <p className="text-sm font-medium text-gray-900">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Timezone</p>
                <p className="text-sm font-medium text-gray-900">
                  {event.timezoneName || event.sourceTimezone}
                  {event.timezoneOffset ? ` (${event.timezoneOffset})` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Organizer</p>
                <p className="text-sm font-medium text-gray-900">
                  {event.createdBy?.username || 'Unknown'}
                </p>
              </div>
            </div>
            {event.category && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                  <Tag className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Category</p>
                  <p className="text-sm font-medium text-gray-900">{event.category.name}</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">About this Event</h2>
            <p className="whitespace-pre-line leading-relaxed text-gray-600">{event.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
