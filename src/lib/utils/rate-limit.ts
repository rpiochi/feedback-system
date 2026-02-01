const RATE_LIMIT_PREFIX = 'rate_limit_';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // em milissegundos
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Verifica se uma ação está dentro do limite de rate
 * @param key - Identificador único da ação (ex: 'create_bug', 'vote')
 * @param config - Configuração de limite
 * @returns true se pode executar, false se excedeu o limite
 */
export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  if (typeof window === 'undefined') return true;

  const storageKey = RATE_LIMIT_PREFIX + key;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(storageKey);
    let entry: RateLimitEntry;

    if (stored) {
      entry = JSON.parse(stored);

      // Se a janela expirou, resetar
      if (now > entry.resetAt) {
        entry = { count: 0, resetAt: now + config.windowMs };
      }
    } else {
      entry = { count: 0, resetAt: now + config.windowMs };
    }

    // Verificar se excedeu
    if (entry.count >= config.maxRequests) {
      return false;
    }

    // Incrementar contador
    entry.count++;
    localStorage.setItem(storageKey, JSON.stringify(entry));

    return true;
  } catch {
    // Se localStorage falhar, permitir a ação
    return true;
  }
}

/**
 * Retorna o tempo restante até o reset do rate limit
 */
export function getRateLimitReset(key: string): number {
  if (typeof window === 'undefined') return 0;

  const storageKey = RATE_LIMIT_PREFIX + key;

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return 0;

    const entry: RateLimitEntry = JSON.parse(stored);
    const remaining = entry.resetAt - Date.now();

    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/**
 * Formata o tempo restante em formato legível
 */
export function formatRemainingTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
}

// Configurações padrão por tipo de ação
export const RATE_LIMITS = {
  CREATE_BUG: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 por hora
  CREATE_FEATURE: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 por hora
  VOTE: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 por minuto
} as const;
