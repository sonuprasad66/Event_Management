import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { categoriesApi } from '../api/categories';
import { eventsApi } from '../api/events';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useQuery } from '@tanstack/react-query';
import type { Category } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().min(1, 'Description is required').max(5000),
  categoryId: z.string().min(1, 'Category is required'),
  publishDateTime: z.string().min(1, 'Publish date is required'),
  sourceTimezone: z.string().min(1),
});

type CreateEventFormValues = z.infer<typeof schema>;

function flattenCategories(
  categories: Category[],
  depth = 0,
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];

  for (const category of categories) {
    result.push({ value: category.id, label: `${'—'.repeat(depth)} ${category.name}`.trim() });
    if (category.children?.length) {
      result.push(...flattenCategories(category.children, depth + 1));
    }
  }

  return result;
}

export function CreateEventPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categoryData } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: () => categoriesApi.tree(),
  });

  const categoryOptions = flattenCategories(categoryData?.data.data || []);
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sourceTimezone: detectedTimezone },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const remaining = 5 - files.length;
    const newFiles = selectedFiles.slice(0, remaining);
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setFiles((previous) => [...previous, ...newFiles]);
    setPreviews((previous) => [...previous, ...newPreviews]);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const onSubmit = async (data: CreateEventFormValues) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('categoryId', data.categoryId);
    formData.append('publishDateTime', data.publishDateTime);
    formData.append('sourceTimezone', data.sourceTimezone);
    files.forEach((file) => formData.append('photos', file));

    try {
      await eventsApi.create(formData);
      toast.success('Event created successfully!');
      navigate('/events');
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to create event';
      toast.error(message || 'Failed to create event');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Event</h1>
          <p className="mt-2 text-gray-500">Fill in the details for your new event</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="border-b pb-3 text-lg font-semibold text-gray-900">Event Details</h2>

            <Input
              label="Title"
              placeholder="Enter event title"
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={5}
                placeholder="Describe your event..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="categoryId"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('categoryId')}
              >
                <option value="">Select a category</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-red-600">{errors.categoryId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="border-b pb-3 text-lg font-semibold text-gray-900">Schedule</h2>

            <Input
              label="Publish Date & Time"
              type="datetime-local"
              error={errors.publishDateTime?.message}
              {...register('publishDateTime')}
            />

            <Input
              label="Timezone"
              error={errors.sourceTimezone?.message}
              helperText="Your browser timezone is pre-filled"
              {...register('sourceTimezone')}
            />
          </div>

          <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="border-b pb-3 text-lg font-semibold text-gray-900">
              Photos <span className="text-sm font-normal text-gray-500">(up to 5)</span>
            </h2>

            {previews.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50"
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Click to upload photos</p>
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP — max 5MB each</p>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {previews.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img src={src} alt="Selected event media" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                <ImageIcon className="h-5 w-5 text-gray-400" />
                No photos selected yet.
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Create Event
          </Button>
        </form>
      </div>
    </div>
  );
}
