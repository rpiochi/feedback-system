'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import type { FeatureWithVotes, FeatureStatus } from '@/types';

const STATUS_LABELS: Record<FeatureStatus, string> = {
  open: 'Aberta',
  planned: 'Planejada',
  in_dev: 'Em Desenvolvimento',
  shipped: 'Lançada',
  rejected: 'Rejeitada',
  hidden: 'Oculta',
};

const STATUS_COLORS: Record<FeatureStatus, string> = {
  open: 'bg-gray-100 text-gray-800',
  planned: 'bg-blue-100 text-blue-800',
  in_dev: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  hidden: 'bg-yellow-100 text-yellow-800',
};

export default function AdminFeaturesPage() {
  const { isAdmin, isLoading: authLoading } = useAdmin();
  const [features, setFeatures] = useState<FeatureWithVotes[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    loadFeatures();
  }, [isAdmin]);

  const loadFeatures = async () => {
    const supabase = createClient();
    // Usar feature_requests diretamente para ver todas (incluindo hidden)
    const { data: featuresData } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: votesData } = await supabase.from('feature_votes_agg').select('*');

    if (featuresData) {
      const votesMap = new Map(votesData?.map((v) => [v.feature_id, v.votes]) || []);
      setFeatures(
        featuresData.map((f) => ({
          ...f,
          votes: votesMap.get(f.id) || 0,
        }))
      );
    }
    setIsLoading(false);
  };

  const updateStatus = async (id: string, status: FeatureStatus) => {
    const supabase = createClient();
    await supabase.from('feature_requests').update({ status }).eq('id', id);
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
  };

  const deleteFeature = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sugestão?')) return;
    const supabase = createClient();
    await supabase.from('feature_requests').delete().eq('id', id);
    setFeatures((prev) => prev.filter((f) => f.id !== id));
  };

  if (authLoading || isLoading) {
    return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  }

  if (!isAdmin) {
    return <div className="text-center py-12 text-red-600">Acesso negado</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Moderar Funcionalidades</h1>
        <a href="/admin" className="text-blue-600 hover:underline">
          ← Voltar
        </a>
      </div>

      {features.length === 0 ? (
        <p className="text-gray-500 text-center py-12">Nenhuma sugestão ainda</p>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-4">
                <div className="text-center min-w-[50px]">
                  <div className="text-2xl font-bold text-gray-900">{feature.votes}</div>
                  <div className="text-xs text-gray-500">votos</div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(feature.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <select
                    value={feature.status}
                    onChange={(e) => updateStatus(feature.id, e.target.value as FeatureStatus)}
                    className={`px-3 py-1 rounded text-sm font-medium border-0 ${STATUS_COLORS[feature.status]}`}
                  >
                    {(Object.keys(STATUS_LABELS) as FeatureStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => deleteFeature(feature.id)}
                    className="text-xs text-red-600 hover:underline"
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
