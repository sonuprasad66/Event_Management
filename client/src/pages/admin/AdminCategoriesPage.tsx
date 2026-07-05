import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoriesApi } from '../../api/categories';
import type { Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Loader } from '../../components/ui/Loader';
import { Modal } from '../../components/ui/Modal';

function flattenCategories(
  categories: Category[],
  depth = 0,
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];

  for (const category of categories) {
    result.push({ value: category.id, label: `${'  '.repeat(depth)}${category.name}` });
    if (category.children?.length) {
      result.push(...flattenCategories(category.children, depth + 1));
    }
  }

  return result;
}

interface CategoryNodeProps {
  category: Category;
  depth?: number;
  onAdd: (parentId: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategoryNode({
  category,
  depth = 0,
  onAdd,
  onEdit,
  onDelete,
}: CategoryNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (category.children?.length || 0) > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`h-5 w-5 text-gray-400 transition-transform ${!hasChildren ? 'invisible' : ''}`}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <span className="flex-1 text-sm font-medium text-gray-900">{category.name}</span>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="mr-2 text-xs text-gray-400">{category._count?.events || 0} events</span>
          <button
            type="button"
            onClick={() => onAdd(category.id)}
            className="rounded p-1 text-indigo-600 hover:bg-indigo-50"
            title="Add child"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="rounded p-1 text-blue-600 hover:bg-blue-50"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(category)}
            className="rounded p-1 text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {category.children?.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              depth={depth + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: () => categoriesApi.tree(),
  });

  const categories = data?.data.data || [];
  const flatCategories = flattenCategories(categories);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; parentId?: string | null }) => categoriesApi.create(payload),
    onSuccess: async () => {
      toast.success('Category created');
      await queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      closeForm();
    },
    onError: (error) => {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Error creating category';
      toast.error(message || 'Error creating category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      data: { name?: string; parentId?: string | null };
    }) => categoriesApi.update(payload.id, payload.data),
    onSuccess: async () => {
      toast.success('Category updated');
      await queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      closeForm();
    },
    onError: (error) => {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Error updating category';
      toast.error(message || 'Error updating category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: async () => {
      toast.success('Category deleted');
      await queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      setDeletingCategory(null);
    },
    onError: (error) => {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Error deleting category';
      toast.error(message || 'Error deleting category');
    },
  });

  const openAdd = (parentId?: string) => {
    setEditingCategory(null);
    setFormName('');
    setFormParentId(parentId || '');
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormParentId(category.parentId || '');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingCategory(null);
    setFormName('');
    setFormParentId('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formName.trim()) {
      return;
    }

    const parentId = formParentId || null;
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: { name: formName.trim(), parentId },
      });
    } else {
      createMutation.mutate({ name: formName.trim(), parentId });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-gray-500">Manage nested event categories</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openAdd()}>
          Add Category
        </Button>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <Loader />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Add your first category to get started."
            action={<Button onClick={() => openAdd()}>Add Category</Button>}
          />
        ) : (
          <div className="p-4">
            {categories.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                onAdd={(parentId) => openAdd(parentId)}
                onEdit={openEdit}
                onDelete={setDeletingCategory}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            placeholder="Enter category name"
            required
          />
          <div className="space-y-1">
            <label htmlFor="parentCategory" className="block text-sm font-medium text-gray-700">
              Parent Category (optional)
            </label>
            <select
              id="parentCategory"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formParentId}
              onChange={(event) => setFormParentId(event.target.value)}
            >
              <option value="">None (Root Category)</option>
              {flatCategories
                .filter((option) => option.value !== editingCategory?.id)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => {
          if (deletingCategory) {
            deleteMutation.mutate(deletingCategory.id);
          }
        }}
        isLoading={deleteMutation.isPending}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This will fail if the category has child categories or events.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
