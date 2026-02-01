'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import type { DevelopmentItem, CreateDevelopmentItemInput } from '@/types';

export default function AdminDevelopmentPage() {
  const { isAdmin, isLoading: authLoading } = useAdmin();
  const [items, setItems] = useState<DevelopmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateDevelopmentItemInput>({
    title: '',
    description: '',
    link: '',
    order_index: 0,
  });

  useEffect(() => {
    if (!isAdmin) return;
    loadItems();
  }, [isAdmin]);

  const loadItems = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('development_items')
      .select('*')
      .order('order_index', { ascending: true });

    if (data) setItems(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (editingId) {
      await supabase
        .from('development_items')
        .update({
          title: form.title,
          description: form.description || null,
          link: form.link || null,
          order_index: form.order_index,
        })
        .eq('id', editingId);
    } else {
      await supabase.from('development_items').insert({
        title: form.title,
        description: form.description || null,
        link: form.link || null,
        order_index: form.order_index,
        is_active: true,
      });
    }

    setForm({ title: '', description: '', link: '', order_index: items.length });
    setShowForm(false);
    setEditingId(null);
    loadItems();
  };

  const startEdit = (item: DevelopmentItem) => {
    setForm({
      title: item.title,
      description: item.description || '',
      link: item.link || '',
      order_index: item.order_index,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const supabase = createClient();
    await supabase.from('development_items').update({ is_active: !isActive }).eq('id', id);
    loadItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    const supabase = createClient();
    await supabase.from('development_items').delete().eq('id', id);
    loadItems();
  };

  const moveItem = async (id: string, direction: 'up' | 'down') => {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const supabase = createClient();
    const currentItem = items[index];
    const swapItem = items[newIndex];

    await Promise.all([
      supabase.from('development_items').update({ order_index: newIndex }).eq('id', currentItem.id),
      supabase.from('development_items').update({ order_index: index }).eq('id', swapItem.id),
    ]);

    loadItems();
  };

  if (authLoading || isLoading) {
    return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  }

  if (!isAdmin) {
    return <div className="text-center py-12 text-red-600">Acesso negado</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Em Desenvolvimento</h1>
        <a href="/admin" className="text-blue-600 hover:underline">
          ← Voltar
        </a>
      </div>

      {/* Botão para adicionar */}
      {!showForm && (
        <button
          onClick={() => {
            setForm({ title: '', description: '', link: '', order_index: items.length });
            setEditingId(null);
            setShowForm(true);
          }}
          className="w-full mb-6 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          + Adicionar Item
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Editar Item' : 'Novo Item'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link (opcional)</label>
              <input
                type="url"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? 'Salvar' : 'Adicionar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista */}
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-12">Nenhum item cadastrado</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`bg-white border rounded-lg p-4 ${
                item.is_active ? 'border-gray-200' : 'border-gray-200 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Reordenar */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={index === items.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600">{item.description}</p>
                  )}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {item.link}
                    </a>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(item.id, item.is_active)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      item.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
