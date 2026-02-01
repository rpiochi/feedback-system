'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import type { Bug, BugStatus } from '@/types';

const STATUS_LABELS: Record<BugStatus, string> = {
  new: 'Novo',
  triaged: 'Triado',
  in_progress: 'Em Progresso',
  resolved: 'Resolvido',
  wont_fix: 'Não Será Corrigido',
};

const STATUS_COLORS: Record<BugStatus, string> = {
  new: 'bg-yellow-100 text-yellow-800',
  triaged: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  wont_fix: 'bg-gray-100 text-gray-800',
};

export default function AdminBugsPage() {
  const { isAdmin, isLoading: authLoading } = useAdmin();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<BugStatus | 'all'>('all');

  useEffect(() => {
    if (!isAdmin) return;
    loadBugs();
  }, [isAdmin]);

  const loadBugs = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('bugs')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setBugs(data);
    setIsLoading(false);
  };

  const updateBugStatus = async (bugId: string, status: BugStatus) => {
    const supabase = createClient();
    await supabase.from('bugs').update({ status }).eq('id', bugId);
    loadBugs();
    if (selectedBug?.id === bugId) {
      setSelectedBug({ ...selectedBug, status });
    }
  };

  if (authLoading || isLoading) {
    return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  }

  if (!isAdmin) {
    return <div className="text-center py-12 text-red-600">Acesso negado</div>;
  }

  const filteredBugs = filter === 'all' ? bugs : bugs.filter((b) => b.status === filter);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Bugs</h1>
        <a href="/admin" className="text-blue-600 hover:underline">
          ← Voltar
        </a>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Todos ({bugs.length})
        </button>
        {(Object.keys(STATUS_LABELS) as BugStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              filter === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {STATUS_LABELS[status]} ({bugs.filter((b) => b.status === status).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <div className="space-y-3">
          {filteredBugs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum bug encontrado</p>
          ) : (
            filteredBugs.map((bug) => (
              <div
                key={bug.id}
                onClick={() => setSelectedBug(bug)}
                className={`p-4 bg-white border rounded-lg cursor-pointer transition-all ${
                  selectedBug?.id === bug.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-gray-500 mb-1">{bug.public_id}</p>
                    <h3 className="font-medium text-gray-900 truncate">{bug.title}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[bug.status]}`}>
                    {STATUS_LABELS[bug.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{bug.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(bug.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Detalhe */}
        {selectedBug && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-mono text-sm text-gray-500">{selectedBug.public_id}</p>
                <h2 className="text-xl font-bold text-gray-900">{selectedBug.title}</h2>
              </div>
              <button
                onClick={() => setSelectedBug(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedBug.status}
                onChange={(e) => updateBugStatus(selectedBug.id, e.target.value as BugStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {(Object.keys(STATUS_LABELS) as BugStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Descrição</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{selectedBug.description}</p>
            </div>

            {/* Campos opcionais */}
            {selectedBug.repro_steps && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Passos para Reproduzir</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedBug.repro_steps}</p>
              </div>
            )}

            {(selectedBug.expected_result || selectedBug.actual_result) && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {selectedBug.expected_result && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Esperado</h3>
                    <p className="text-gray-600 text-sm">{selectedBug.expected_result}</p>
                  </div>
                )}
                {selectedBug.actual_result && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Obtido</h3>
                    <p className="text-gray-600 text-sm">{selectedBug.actual_result}</p>
                  </div>
                )}
              </div>
            )}

            {/* Metadados */}
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
              {selectedBug.module && (
                <div>
                  <span className="text-gray-500">Módulo:</span>{' '}
                  <span className="text-gray-900">{selectedBug.module}</span>
                </div>
              )}
              {selectedBug.severity && (
                <div>
                  <span className="text-gray-500">Severidade:</span>{' '}
                  <span className="text-gray-900 capitalize">{selectedBug.severity}</span>
                </div>
              )}
              {selectedBug.page_url && (
                <div className="col-span-2">
                  <span className="text-gray-500">URL:</span>{' '}
                  <span className="text-gray-900 font-mono text-xs">{selectedBug.page_url}</span>
                </div>
              )}
              {selectedBug.environment && (
                <div className="col-span-2">
                  <span className="text-gray-500">Ambiente:</span>
                  <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(selectedBug.environment, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
