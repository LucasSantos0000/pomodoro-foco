/**
 * Acesso de baixo nível ao localStorage, com tratamento de erros.
 * Falhas de gravação (cota excedida, modo privado, armazenamento desativado) são
 * convertidas em ErroPersistencia para que a interface possa avisar o usuário (RNF-06).
 */

export const CHAVES = {
  presets: 'pomodoro.presets',
  tarefas: 'pomodoro.tarefas',
  sessaoAtiva: 'pomodoro.sessaoAtiva',
} as const;

export class ErroPersistencia extends Error {
  constructor(mensagem: string, options?: { cause?: unknown }) {
    super(mensagem, options);
    this.name = 'ErroPersistencia';
  }
}

export type Leitura<T> =
  | { tipo: 'ausente' }
  | { tipo: 'ok'; valor: T }
  | { tipo: 'corrompido' };

/** Lê e valida um valor JSON. Nunca lança exceção. */
export function lerJson<T>(chave: string, validar: (v: unknown) => v is T): Leitura<T> {
  let bruto: string | null;
  try {
    bruto = window.localStorage.getItem(chave);
  } catch {
    return { tipo: 'corrompido' };
  }
  if (bruto === null) return { tipo: 'ausente' };
  try {
    const valor: unknown = JSON.parse(bruto);
    return validar(valor) ? { tipo: 'ok', valor } : { tipo: 'corrompido' };
  } catch {
    return { tipo: 'corrompido' };
  }
}

/** Grava um valor como JSON. Lança ErroPersistencia em caso de falha. */
export function gravarJson(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch (e) {
    throw new ErroPersistencia('Não foi possível salvar os dados no navegador.', { cause: e });
  }
}

export function removerChave(chave: string): void {
  try {
    window.localStorage.removeItem(chave);
  } catch (e) {
    throw new ErroPersistencia('Não foi possível remover os dados do navegador.', { cause: e });
  }
}

/** Valida listas inteiras: se algum item estiver inválido, a lista é considerada corrompida. */
export function listaDe<T>(validarItem: (v: unknown) => v is T) {
  return (v: unknown): v is T[] => Array.isArray(v) && v.every(validarItem);
}
