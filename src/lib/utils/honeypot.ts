/**
 * Hook para gerenciar campo honeypot em formulários
 *
 * O honeypot é um campo oculto que não deve ser preenchido por humanos.
 * Bots que preenchem automaticamente todos os campos serão bloqueados.
 */

/**
 * Verifica se o honeypot foi preenchido (indica spam)
 */
export function isHoneypotFilled(value: string): boolean {
  return value !== '';
}

/**
 * Nome do campo honeypot (parece um campo legítimo para enganar bots)
 */
export const HONEYPOT_FIELD_NAME = 'website_url';
