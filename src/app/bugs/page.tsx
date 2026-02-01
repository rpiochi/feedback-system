'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { captureEnvironment } from '@/lib/utils/environment';
import { checkRateLimit, getRateLimitReset, formatRemainingTime, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { isHoneypotFilled } from '@/lib/utils/honeypot';
import { FileUpload } from '@/components/bugs/FileUpload';
import { Honeypot } from '@/components/ui/Honeypot';
import type { BugSeverity, CreateBugInput } from '@/types';

const MODULES = ['Financeiro', 'Tarefas', 'Relatórios', 'Integrações', 'Outro'] as const;
const SEVERITIES: { value: BugSeverity; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

export default function BugsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ publicId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [honeypot, setHoneypot] = useState('');

  const [form, setForm] = useState<CreateBugInput>({
    title: '',
    description: '',
    repro_steps: '',
    expected_result: '',
    actual_result: '',
    module: '',
    severity: undefined,
    page_url: '',
  });

  const uploadFiles = async (bugId: string, filesToUpload: File[]) => {
    const supabase = createClient();
    const results = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadProgress(`Enviando arquivo ${i + 1} de ${filesToUpload.length}...`);

      const fileName = `${bugId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('bug-screenshots')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      // Registrar anexo no banco
      await supabase.from('bug_attachments').insert({
        bug_id: bugId,
        storage_path: fileName,
        mime_type: file.type,
        file_size: file.size,
      });

      results.push(fileName);
    }

    setUploadProgress(null);
    return results;
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
    if (!checkRateLimit('create_bug', RATE_LIMITS.CREATE_BUG)) {
      const remaining = getRateLimitReset('create_bug');
      setError(`Muitos envios recentes. Tente novamente em ${formatRemainingTime(remaining)}.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const environment = captureEnvironment();

      const { data, error: insertError } = await supabase
        .from('bugs')
        .insert({
          title: form.title,
          description: form.description,
          repro_steps: form.repro_steps || null,
          expected_result: form.expected_result || null,
          actual_result: form.actual_result || null,
          module: form.module || null,
          severity: form.severity || null,
          page_url: form.page_url || null,
          environment,
        })
        .select('id, public_id')
        .single();

      if (insertError) throw insertError;

      // Upload de arquivos
      if (files.length > 0) {
        await uploadFiles(data.id, files);
      }

      setSuccess({ publicId: data.public_id });
      setForm({
        title: '',
        description: '',
        repro_steps: '',
        expected_result: '',
        actual_result: '',
        module: '',
        severity: undefined,
        page_url: '',
      });
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Bug reportado com sucesso!</h1>
          <p className="text-green-700 mb-4">
            Seu bug foi registrado com o código:
          </p>
          <p className="text-3xl font-mono font-bold text-green-900 mb-6">
            {success.publicId}
          </p>
          <p className="text-sm text-green-600 mb-6">
            Guarde este código para acompanhamento futuro.
          </p>
          <button
            onClick={() => setSuccess(null)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Reportar outro bug
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportar Bug</h1>
        <p className="text-gray-600">
          Encontrou um problema? Descreva-o abaixo para que possamos investigar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Honeypot anti-spam */}
        <Honeypot value={honeypot} onChange={setHoneypot} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Título */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Resumo breve do problema"
            minLength={5}
            maxLength={120}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">{form.title.length}/120 caracteres</p>
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descrição <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descreva o problema em detalhes..."
            minLength={20}
            maxLength={4000}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">{form.description.length}/4000 caracteres</p>
        </div>

        {/* Passos para reproduzir */}
        <div>
          <label htmlFor="repro_steps" className="block text-sm font-medium text-gray-700 mb-1">
            Passos para reproduzir
          </label>
          <textarea
            id="repro_steps"
            value={form.repro_steps}
            onChange={(e) => setForm({ ...form, repro_steps: e.target.value })}
            placeholder="1. Acesse a página X&#10;2. Clique no botão Y&#10;3. O erro acontece"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Resultado esperado e obtido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="expected_result" className="block text-sm font-medium text-gray-700 mb-1">
              Resultado esperado
            </label>
            <textarea
              id="expected_result"
              value={form.expected_result}
              onChange={(e) => setForm({ ...form, expected_result: e.target.value })}
              placeholder="O que deveria acontecer?"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="actual_result" className="block text-sm font-medium text-gray-700 mb-1">
              Resultado obtido
            </label>
            <textarea
              id="actual_result"
              value={form.actual_result}
              onChange={(e) => setForm({ ...form, actual_result: e.target.value })}
              placeholder="O que aconteceu de fato?"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Módulo e Severidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="module" className="block text-sm font-medium text-gray-700 mb-1">
              Módulo
            </label>
            <select
              id="module"
              value={form.module}
              onChange={(e) => setForm({ ...form, module: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {MODULES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
              Severidade percebida
            </label>
            <select
              id="severity"
              value={form.severity || ''}
              onChange={(e) => setForm({ ...form, severity: (e.target.value as BugSeverity) || undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* URL da página */}
        <div>
          <label htmlFor="page_url" className="block text-sm font-medium text-gray-700 mb-1">
            URL onde ocorreu o problema
          </label>
          <input
            type="text"
            id="page_url"
            value={form.page_url}
            onChange={(e) => setForm({ ...form, page_url: e.target.value })}
            placeholder="/dashboard/financeiro"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Upload de Screenshots */}
        <FileUpload files={files} onFilesChange={setFiles} />

        {/* Info sobre ambiente */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium mb-1">Informações capturadas automaticamente:</p>
          <p>Sistema operacional, navegador, tamanho da tela e versão do app serão enviados para ajudar na investigação.</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-6 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? uploadProgress || 'Enviando...'
            : 'Enviar Bug Report'}
        </button>
      </form>
    </div>
  );
}
