import { Clock, Image, Tag, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Event } from '../../types';
import { Badge } from '../ui/Badge';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const firstImage = event.media?.[0];
  const formattedDate = event.publishAtLocal
    ? new Date(event.publishAtLocal).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(event.publishAtUtc).toLocaleString();

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-video overflow-hidden bg-gray-100">
        {firstImage ? (
          <img
            src={firstImage.url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Image className="h-10 w-10 text-gray-300" />
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        {event.category && <Badge variant="info">{event.category.name}</Badge>}
        <h3 className="line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
          {event.title}
        </h3>
        <p className="line-clamp-2 text-sm text-gray-500">{event.description}</p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {event.createdBy?.username || 'Unknown'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          {event.timezoneName && (
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              {event.timezoneName}
            </span>
          )}
        </div>
        {event.media && event.media.length > 1 && (
          <p className="text-xs text-gray-400">
            +{event.media.length - 1} more photo{event.media.length > 2 ? 's' : ''}
          </p>
        )}
      </div>
    </Link>
  );
}
