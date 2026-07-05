import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image, Plus, RotateCcw, Trash, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { categoriesApi } from '../../api/categories';
import type { Category, Event } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Loader } from '../../components/ui/Loader';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';

type FilterStatus = 'all' | 'published' | 'waiting' | 'deleted';

// ── helpers ──────────────────────────────────────────────────────────────────

function flattenCategories(cats: Category[], depth = 0): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  for (const c of cats) {
    result.push({ value: c.id, label: `${'—'.repeat(depth)} ${c.name}`.trim() });
    if (c.children?.length) result.push(...flattenCategories(c.children, depth + 1));
  }
  return result;
}

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().min(1, 'Description is required').max(5000),
  categoryId: z.string().min(1, 'Category is required'),
  publishDateTime: z.string().min(1, 'Publish date is required'),
  sourceTimezone: z.string().min(1),
});
type CreateEventForm = z.infer<typeof createEventSchema>;

// ── component ─────────────────────────────────────────────────────────────────

export function AdminEventsPage() {
  const queryClient = useQueryClient();

  // filter state
  const [status, setStatus] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  // confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: 'soft' | 'permanent' | 'restore';
    event: Event;
  } | null>(null);

  // create event modal
  const [createOpen, setCreateOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── queries ──────────────────────────────────────────────────────────────────

  const params = {
    page: String(page),
    limit: '10',
    ...(status !== 'all' && { status }),
    ...(search && { search }),
    ...(categoryId && { categoryId }),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['admin-events', params],
    queryFn: () => adminApi.events(params),
  });

  const { data: categoryTreeData } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: () => categoriesApi.tree(),
  });

  const { data: categoryData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: '100' }),
  });

  // ── mutations ─────────────────────────────────────────────────────────────────

  const invalidateDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-events'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-events-recent'] }),
    ]);
  };

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.softDelete(id),
    onSuccess: async () => { toast.success('Event soft deleted'); await invalidateDashboard(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error'),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.permanentDelete(id),
    onSuccess: async () => { toast.success('Event permanently deleted'); await invalidateDashboard(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminApi.restore(id),
    onSuccess: async () => { toast.success('Event restored'); await invalidateDashboard(); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error'),
  });

  const createEventMutation = useMutation({
    mutationFn: (fd: FormData) => adminApi.createEvent(fd),
    onSuccess: async () => {
      toast.success('Event created successfully');
      await invalidateDashboard();
      closeCreateModal();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create event'),
  });

  // ── create event form ─────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { sourceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const newFiles = selected.slice(0, 5 - files.length);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    resetForm();
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
  };

  const onCreateSubmit = (data: CreateEventForm) => {
    const fd = new FormData();
    fd.append('title', data.title);
    fd.append('description', data.description);
    fd.append('categoryId', data.categoryId);
    fd.append('publishDateTime', data.publishDateTime);
    fd.append('sourceTimezone', data.sourceTimezone);
    files.forEach((f) => fd.append('photos', f));
    createEventMutation.mutate(fd);
  };

  // ── confirm dialog ────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'soft') await softDeleteMutation.mutateAsync(confirmAction.event.id);
    else if (confirmAction.type === 'permanent') await permanentDeleteMutation.mutateAsync(confirmAction.event.id);
    else await restoreMutation.mutateAsync(confirmAction.event.id);
    setConfirmAction(null);
  };

  const isConfirmLoading =
    softDeleteMutation.isPending || permanentDeleteMutation.isPending || restoreMutation.isPending;

  // ── derived data ──────────────────────────────────────────────────────────────

  const events = eventsData?.data.data ?? [];
  const pagination = eventsData?.data.pagination;
  const categories = categoryData?.data.data ?? [];
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const nestedCategoryOptions = flattenCategories(categoryTreeData?.data.data ?? []);

  const statusTabs: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'deleted', label: 'Deleted' },
  ];

  const statusBadge = (s?: string) => {
    if (s === 'published') return <Badge variant="success">Published</Badge>;
    if (s === 'waiting') return <Badge variant="warning">Waiting</Badge>;
    if (s === 'deleted') return <Badge variant="danger">Deleted</Badge>;
    return <Badge>—</Badge>;
  };

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          Add Event
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-48 flex-1">
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-48">
          <Select
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            placeholder="All Categories"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Loader text="Loading events..." />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Try adjusting filters or add a new event."
          action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Add Event</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Publish Time</th>
                  <th className="px-4 py-3">Media</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {event.media?.[0] ? (
                        <img src={event.media[0].url} alt={event.title} className="h-12 w-16 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-16 items-center justify-center rounded bg-gray-100">
                          <Image className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 font-medium text-gray-900">
                      <span className="line-clamp-2">{event.title}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{event.createdBy?.username ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{event.category?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      <div>
                        {event.publishAtLocal
                          ? new Date(event.publishAtLocal).toLocaleDateString()
                          : new Date(event.publishAtUtc).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">{event.timezoneName ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{event.media?.length ?? 0}</td>
                    <td className="px-4 py-3">{statusBadge(event.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {event.status !== 'deleted' && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: 'soft', event })}
                            className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                            title="Soft Delete"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                        {event.status === 'deleted' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'restore', event })}
                              className="rounded p-1.5 text-green-600 hover:bg-green-50"
                              title="Restore"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'permanent', event })}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              title="Permanent Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { void handleConfirm(); }}
        isLoading={isConfirmLoading}
        title={
          confirmAction?.type === 'permanent'
            ? 'Permanently Delete Event'
            : confirmAction?.type === 'soft'
              ? 'Delete Event'
              : 'Restore Event'
        }
        message={
          confirmAction?.type === 'permanent'
            ? `Permanently delete "${confirmAction.event.title}"? All media files will also be removed. This cannot be undone.`
            : confirmAction?.type === 'soft'
              ? `Delete "${confirmAction.event.title}"? It can be restored later.`
              : `Restore "${confirmAction?.event.title}"?`
        }
        confirmLabel={
          confirmAction?.type === 'restore' ? 'Restore'
            : confirmAction?.type === 'permanent' ? 'Delete Permanently'
              : 'Delete'
        }
        confirmVariant={confirmAction?.type === 'restore' ? 'primary' : 'danger'}
      />

      {/* ── Create Event Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={createOpen} onClose={closeCreateModal} title="Add New Event" size="lg">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">

          <Input
            label="Title"
            placeholder="Event title"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={4}
              placeholder="Describe the event…"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('categoryId')}
            >
              <option value="">Select a category</option>
              {nestedCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-red-600">{errors.categoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Publish Date & Time"
              type="datetime-local"
              error={errors.publishDateTime?.message}
              {...register('publishDateTime')}
            />
            <Input
              label="Source Timezone"
              error={errors.sourceTimezone?.message}
              helperText="IANA timezone, e.g. Asia/Kolkata"
              {...register('sourceTimezone')}
            />
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Photos <span className="text-gray-400 font-normal">(up to 5)</span>
            </label>

            {files.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-5 text-sm text-gray-500 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Click to upload photos
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

            {previews.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border bg-gray-100">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={closeCreateModal} disabled={createEventMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createEventMutation.isPending}>
              Create Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
