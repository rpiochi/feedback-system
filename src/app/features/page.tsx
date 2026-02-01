'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getOrCreateVoterToken,
  getVotedFeatureSet,
  markFeatureAsVoted,
} from '@/lib/utils/voter-token';
import { checkRateLimit, getRateLimitReset, formatRemainingTime, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { isHoneypotFilled } from '@/lib/utils/honeypot';
import { Honeypot } from '@/components/ui/Honeypot';
import type { FeatureWithVotes, DevelopmentItem, CreateFeatureInput } from '@/types';

type SortOrder = 'votes' | 'recent';

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureWithVotes[]>([]);
  const [devItems, setDevItems] = useState<DevelopmentItem[]>([]);
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('votes');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const [form, setForm] = useState<CreateFeatureInput>({
    title: '',
    description: '',
  });

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const [featuresRes, devItemsRes] = await Promise.all([
      supabase
        .from('features_with_votes')
        .select('*')
        .order(sortOrder === 'votes' ? 'votes' : 'created_at', { ascending: false }),
      supabase
        .from('development_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true }),
    ]);

    if (featuresRes.data) setFeatures(featuresRes.data);
    if (devItemsRes.data) setDevItems(devItemsRes.data);
    setIsLoading(false);
  }, [sortOrder]);

  useEffect(() => {
    loadData();
    setVotedSet(getVotedFeatureSet());
  }, [loadData]);

  const handleVote = async (featureId: string) => {
    if (votedSet.has(featureId) || votingId) return;

    // Verificar rate limit para votos
    if (!checkRateLimit('vote', RATE_LIMITS.VOTE)) {
      return; // Silenciosamente ignorar se exceder rate limit de votos
    }

    setVotingId(featureId);
    const voterToken = getOrCreateVoterToken();
    const supabase = createClient();

    // UI otimista
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, votes: f.votes + 1 } : f))
    );
    setVotedSet((prev) => new Set([...prev, featureId]));
    markFeatureAsVoted(featureId);

    try {
      const { error } = await supabase.from('feature_votes').insert({
        feature_id: featureId,
        voter_token: voterToken,
      });

      if (error) {
        // 409 = já votou (constraint violation)
        if (error.code === '23505') {
          // Manter como votado
        } else {
          throw error;
        }
      }
    } catch {
      // Rollback
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, votes: f.votes - 1 } : f))
      );
      setVotedSet((prev) => {
        const newSet = new Set(prev);
        newSet.delete(featureId);
        return newSet;
      });
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Verificar honeypot (anti-bot)
    if (isHoneypotFilled(honeypot)) {
      setError('Submissão inválida detectada.');
      setIsSubmitting(false);
      return;
    }

    // Verificar rate limit
    if (!checkRateLimit('create_feature', RATE_LIMITS.CREATE_FEATURE)) {
      const remaining = getRateLimitReset('create_feature');
      setError(`Muitos envios recentes. Tente novamente em ${formatRemainingTime(remaining)}.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from('feature_requests').insert({
        title: form.title,
        description: form.description,
      });

      if (insertError) throw insertError;

      setForm({ title: '', description: '' });
      setHoneypot('');
      setShowForm(false);
      setSuccessMessage('Sugestão enviada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar sugestão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFeatures = features.filter(
    (f) =>
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Funcionalidades</h1>
        <p className="text-gray-600">
          Sugira novas funcionalidades e vote nas que você mais quer ver implementadas.
        </p>
      </div>

      {/* Funcionalidades em Desenvolvimento */}
      {devItems.length > 0 && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <span>🚀</span> Em Desenvolvimento
          </h2>
          <ul className="space-y-3">
            {devItems.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="text-blue-500 mt-1">•</span>
                <div>
                  <p className="font-medium text-blue-900">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-blue-700">{item.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botão para abrir formulário */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-6 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Sugerir Nova Funcionalidade
        </button>
      )}

      {/* Formulário de sugestão */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova Sugestão</h2>

          {/* Honeypot anti-spam */}
          <Honeypot value={honeypot} onChange={setHoneypot} />

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nome da funcionalidade"
                minLength={5}
                maxLength={120}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva a funcionalidade e como ela ajudaria..."
                minLength={20}
                maxLength={2000}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Sugestão'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="py-2 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar sugestões..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setSortOrder('votes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortOrder === 'votes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mais votadas
          </button>
          <button
            onClick={() => setSortOrder('recent')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortOrder === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recentes
          </button>
        </div>
      </div>

      {/* Lista de features */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {search ? 'Nenhuma sugestão encontrada.' : 'Nenhuma sugestão ainda. Seja o primeiro!'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeatures.map((feature) => {
            const hasVoted = votedSet.has(feature.id);
            const isVoting = votingId === feature.id;

            return (
              <div
                key={feature.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4"
              >
                <button
                  onClick={() => handleVote(feature.id)}
                  disabled={hasVoted || isVoting}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-lg font-medium transition-all ${
                    hasVoted
                      ? 'bg-blue-100 text-blue-700 cursor-default'
                      : isVoting
                      ? 'bg-gray-100 text-gray-400 cursor-wait'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <span className="text-lg">{hasVoted ? '✓' : '▲'}</span>
                  <span className="text-sm">{feature.votes}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{feature.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(feature.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nota LGPD */}
      <p className="mt-8 text-xs text-gray-500 text-center">
        Usamos armazenamento local para garantir 1 voto por funcionalidade neste dispositivo.
      </p>
    </div>
  );
}
