/**
 * Gera um identificador único.
 * crypto.randomUUID só existe em contextos seguros (https ou localhost); o fallback
 * cobre o acesso pelo celular via IP da rede local durante o desenvolvimento.
 */
export function gerarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
