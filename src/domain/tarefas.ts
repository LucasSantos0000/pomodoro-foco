import type { DadosTarefa, EstadoTarefa, Prioridade, ResultadoValidacao, Tarefa } from './tipos';

export const LIMITE_TITULO = 100;

export const ESTADOS: readonly EstadoTarefa[] = ['backlog', 'aFazer', 'emExecucao', 'concluida', 'cancelada'];
export const PRIORIDADES: readonly Prioridade[] = ['alta', 'media', 'baixa'];

export const ROTULO_ESTADO: Record<EstadoTarefa, string> = {
  backlog: 'Backlog',
  aFazer: 'A fazer',
  emExecucao: 'Em execução',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

/** RN-12: valores padrão de uma nova tarefa. */
export const TAREFA_PADRAO: DadosTarefa = { titulo: '', estado: 'backlog', prioridade: 'media' };

/** RN-10: prioridade decrescente, depois estado nesta ordem fixa. */
const ORDEM_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };
const ORDEM_ESTADO: Record<EstadoTarefa, number> = {
  aFazer: 0,
  emExecucao: 1,
  concluida: 2,
  cancelada: 3,
  backlog: 4,
};

export function compararTarefas(a: Tarefa, b: Tarefa): number {
  return (
    ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] ||
    ORDEM_ESTADO[a.estado] - ORDEM_ESTADO[b.estado] ||
    a.criadaEm - b.criadaEm // desempate estável: mais antiga primeiro
  );
}

export function ordenarTarefas(tarefas: readonly Tarefa[]): Tarefa[] {
  return [...tarefas].sort(compararTarefas);
}

/** VR-06 a VR-08. */
export function validarTarefa(dados: DadosTarefa): ResultadoValidacao<DadosTarefa> {
  const erros: Partial<Record<keyof DadosTarefa, string>> = {};
  const titulo = dados.titulo.trim();
  if (titulo.length === 0) erros.titulo = 'O título é obrigatório.';
  else if (titulo.length > LIMITE_TITULO) erros.titulo = `O título deve ter no máximo ${LIMITE_TITULO} caracteres.`;
  if (!ESTADOS.includes(dados.estado)) erros.estado = 'Selecione um estado válido.';
  if (!PRIORIDADES.includes(dados.prioridade)) erros.prioridade = 'Selecione uma prioridade válida.';
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, valores: { ...dados, titulo } };
}

export function criarTarefa(dados: DadosTarefa, id: string, agora: number): Tarefa {
  return { id, ...dados, criadaEm: agora, atualizadaEm: agora };
}

export function atualizarTarefa(tarefa: Tarefa, dados: DadosTarefa, agora: number): Tarefa {
  return { ...tarefa, ...dados, atualizadaEm: agora };
}

export function ehTarefaValida(v: unknown): v is Tarefa {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.titulo === 'string' &&
    typeof t.criadaEm === 'number' &&
    typeof t.atualizadaEm === 'number' &&
    validarTarefa({
      titulo: t.titulo,
      estado: t.estado as EstadoTarefa,
      prioridade: t.prioridade as Prioridade,
    }).ok
  );
}
