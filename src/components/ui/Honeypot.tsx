'use client';

import { HONEYPOT_FIELD_NAME } from '@/lib/utils/honeypot';

interface HoneypotProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Campo honeypot invisível para detecção de bots
 * Não deve ser visível para usuários humanos
 */
export function Honeypot({ value, onChange }: HoneypotProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        opacity: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <label htmlFor={HONEYPOT_FIELD_NAME}>
        Website (deixe em branco)
      </label>
      <input
        type="text"
        id={HONEYPOT_FIELD_NAME}
        name={HONEYPOT_FIELD_NAME}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
