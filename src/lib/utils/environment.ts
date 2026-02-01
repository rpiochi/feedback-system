import type { BugEnvironment } from '@/types/database';

/**
 * Captura informações do ambiente do usuário automaticamente
 */
export function captureEnvironment(): BugEnvironment {
  if (typeof window === 'undefined') {
    return {};
  }

  const ua = navigator.userAgent;

  return {
    os: getOS(ua),
    browser: getBrowser(ua),
    device: getDevice(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    user_agent: ua,
  };
}

function getOS(ua: string): string {
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Desconhecido';
}

function getBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Desconhecido';
}

function getDevice(): string {
  if (typeof window === 'undefined') return 'Desconhecido';

  const width = window.innerWidth;
  if (width < 768) return 'Mobile';
  if (width < 1024) return 'Tablet';
  return 'Desktop';
}
