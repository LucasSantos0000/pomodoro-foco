/**
 * Tipos do domínio, conforme o modelo conceitual de dados (seção 11 do documento de requisitos).
 * Todos os timestamps são milissegundos desde a época Unix (Date.now()).
 */

export type Timestamp = number;

// ---------- Temporizador personalizado (preset) ----------

export interface ParametrosPreset {
  tempoFocoMin: number;
  tempoPausaCurtaMin: number;
  ciclosAntesPausaLonga: number;
  tempoPausaLongaMin: number;
}

export interface Preset extends ParametrosPreset {
  id: string;
  nome: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/** Dados que o usuário informa ao criar/editar um preset. */
export type DadosPreset = Pick<Preset, 'nome'> & ParametrosPreset;

/** Cópia dos parâmetros do preset no início da sessão (RN-05). */
export type SnapshotPreset = DadosPreset;

// ---------- Sessão ativa ----------

export type Fase = 'foco' | 'pausaCurta' | 'pausaLonga';
export type StatusSessao = 'emAndamento' | 'pausada' | 'concluida';

export interface SessaoAtiva {
  id: string;
  presetId: string;
  snapshotPreset: SnapshotPreset;
  faseAtual: Fase;
  /** Posição do ciclo na sessão (1 a ciclosAntesPausaLonga). */
  cicloAtual: number;
  /**
   * Contagem de ciclos efetivamente concluídos (extensão do modelo).
   * Só é incrementada quando foco e pausa do ciclo terminam sem serem pulados (RN-03).
   */
  ciclosConcluidos: number;
  /** Indica se o foco do ciclo corrente foi pulado (extensão do modelo, apoia RN-03). */
  focoPuladoNoCiclo: boolean;
  status: StatusSessao;
  inicioFaseEm: Timestamp;
  fimFasePrevistoEm: Timestamp;
  pausadaEm: Timestamp | null;
  tempoRestanteAoPausarMs: number | null;
  criadaEm: Timestamp;
  atualizadaEm: Timestamp;
}

// ---------- Tarefa ----------

export type EstadoTarefa = 'backlog' | 'aFazer' | 'emExecucao' | 'concluida' | 'cancelada';
export type Prioridade = 'baixa' | 'media' | 'alta';

export interface Tarefa {
  id: string;
  titulo: string;
  estado: EstadoTarefa;
  prioridade: Prioridade;
  criadaEm: Timestamp;
  atualizadaEm: Timestamp;
}

export type DadosTarefa = Pick<Tarefa, 'titulo' | 'estado' | 'prioridade'>;

// ---------- Utilitários ----------

/** Resultado de validação de formulário: valores convertidos ou erros por campo. */
export type ResultadoValidacao<T> =
  | { ok: true; valores: T }
  | { ok: false; erros: Partial<Record<keyof T, string>> };
