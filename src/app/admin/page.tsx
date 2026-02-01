'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        const { data } = await supabase.rpc('is_platform_admin');
        setIsAdmin(data === true);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoggingIn(false);
      return;
    }

    if (data.user) {
      setUser(data.user);
      const { data: adminData } = await supabase.rpc('is_platform_admin');
      setIsAdmin(adminData === true);
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
        <p className="text-gray-600 mb-4">Você não tem permissão de administrador.</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Admin</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Sair
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <a
          href="/admin/bugs"
          className="block p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-2">🐛</div>
          <h2 className="font-semibold text-gray-900">Bugs</h2>
          <p className="text-sm text-gray-600">Gerenciar bugs reportados</p>
        </a>

        <a
          href="/admin/features"
          className="block p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-2">💡</div>
          <h2 className="font-semibold text-gray-900">Funcionalidades</h2>
          <p className="text-sm text-gray-600">Moderar sugestões</p>
        </a>

        <a
          href="/admin/development"
          className="block p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
        >
          <div className="text-3xl mb-2">🚀</div>
          <h2 className="font-semibold text-gray-900">Em Desenvolvimento</h2>
          <p className="text-sm text-gray-600">Gerenciar itens do roadmap</p>
        </a>
      </div>
    </div>
  );
}
