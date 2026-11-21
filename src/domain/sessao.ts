/**
 * Máquina de estados da sessão de foco.
 *
 * Todas as funções são puras: recebem o estado atual e o instante "agora" e devolvem um
 * novo estado, sem efeitos colaterais. Isso permite testar as regras de negócio sem
 * navegador e garante que o avanço de fases dependa apenas de timestamps absolutos
 * (RN-07, RNF-03), e não de contadores em memória.
 *
 * Sequência de fases de uma sessão com N ciclos:
 *   foco(1) → pausaCurta(1) → foco(2) → ... → foco(N) → pausaLonga(N) → concluída
 */
import type { Fase, Preset, SessaoAtiva, SnapshotPreset, StatusSessao } from './tipos';

const MS_POR_MINUTO = 60_000;

export const ROTULO_FASE: Record<Fase, string> = {
  foco: 'Foco',
  pausaCurta: 'Pausa curta',
  pausaLonga: 'Pausa longa',
};

export const ROTULO_STATUS: Record<StatusSessao, string> = {
  emAndamento: 'Em andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

export function duracaoFaseMs(snapshot: SnapshotPreset, fase: Fase): number {
  switch (fase) {
    case 'foco':
      return snapshot.tempoFocoMin * MS_POR_MINUTO;
    case 'pausaCurta':
      return snapshot.tempoPausaCurtaMin * MS_POR_MINUTO;
    case 'pausaLonga':
      return snapshot.tempoPausaLongaMin * MS_POR_MINUTO;
  }
}

/** Próxima posição prevista na sequência, ou null se a fase atual for a última. */
export function proximaPosicao(
  snapshot: SnapshotPreset,
  fase: Fase,
  ciclo: number,
): { fase: Fase; ciclo: number } | null {
  const total = snapshot.ciclosAntesPausaLonga;
  if (fase === 'foco') return { fase: ciclo < total ? 'pausaCurta' : 'pausaLonga', ciclo };
  if (fase === 'pausaCurta' && ciclo < total) return { fase: 'foco', ciclo: ciclo + 1 };
  return null; // pausa longa (ou pausa do último ciclo): fim da sessão
}

/** Sessão "ativa" para efeito de bloqueio do preset (RN-01): em andamento ou pausada. */
export function sessaoBloqueiaPreset(sessao: SessaoAtiva | null, presetId: string): boolean {
  return sessao !== null && sessao.status !== 'concluida' && sessao.presetId === presetId;
}

export function iniciarSessao(preset: Preset, id: string, agora: number): SessaoAtiva {
  // RN-05: snapshot dos parâmetros no momento do início
  const snapshotPreset: SnapshotPreset = {
    nome: preset.nome,
    tempoFocoMin: preset.tempoFocoMin,
    tempoPausaCurtaMin: preset.tempoPausaCurtaMin,
    ciclosAntesPausaLonga: preset.ciclosAntesPausaLonga,
    tempoPausaLongaMin: preset.tempoPausaLongaMin,
  };
  return {
    id,
    presetId: preset.id,
    snapshotPreset,
    faseAtual: 'foco',
    cicloAtual: 1,
    ciclosConcluidos: 0,
    focoPuladoNoCiclo: false,
    status: 'emAndamento',
    inicioFaseEm: agora,
    fimFasePrevistoEm: agora + duracaoFaseMs(snapshotPreset, 'foco'),
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    criadaEm: agora,
    atualizadaEm: agora,
  };
}

/** Tempo restante da fase atual, em ms (nunca negativo). */
export function tempoRestanteMs(sessao: SessaoAtiva, agora: number): number {
  if (sessao.status === 'concluida') return 0;
  if (sessao.status === 'pausada') return sessao.tempoRestanteAoPausarMs ?? 0;
  return Math.max(0, sessao.fimFasePrevistoEm - agora);
}

/** RF-06 / UC05: pausa preservando o tempo restante. */
export function pausarSessao(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status !== 'emAndamento') return sessao;
  return {
    ...sessao,
    status: 'pausada',
    pausadaEm: agora,
    tempoRestanteAoPausarMs: Math.max(0, sessao.fimFasePrevistoEm - agora),
    atualizadaEm: agora,
  };
}

/** RF-07 / UC05: retoma recalculando o fim da fase a partir do instante da retomada. */
export function retomarSessao(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status !== 'pausada') return sessao;
  const restante = sessao.tempoRestanteAoPausarMs ?? 0;
  const fim = agora + restante;
  return {
    ...sessao,
    status: 'emAndamento',
    // início ajustado para que (fim - início) continue igual à duração da fase
    inicioFaseEm: fim - duracaoFaseMs(sessao.snapshotPreset, sessao.faseAtual),
    fimFasePrevistoEm: fim,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agora,
  };
}

function concluirSessao(sessao: SessaoAtiva, instante: number, agora: number): SessaoAtiva {
  return {
    ...sessao,
    status: 'concluida',
    fimFasePrevistoEm: instante,
    pausadaEm: null,
    tempoRestanteAoPausarMs: null,
    atualizadaEm: agora,
  };
}

/**
 * Move a sessão para a próxima fase prevista, que começa em `inicio`.
 * Se estava pausada, a nova fase também fica pausada com o tempo cheio.
 */
function irParaProximaFase(sessao: SessaoAtiva, inicio: number, agora: number): SessaoAtiva {
  const prox = proximaPosicao(sessao.snapshotPreset, sessao.faseAtual, sessao.cicloAtual);
  if (prox === null) return concluirSessao(sessao, inicio, agora);

  const duracao = duracaoFaseMs(sessao.snapshotPreset, prox.fase);
  const pausada = sessao.status === 'pausada';
  return {
    ...sessao,
    faseAtual: prox.fase,
    cicloAtual: prox.ciclo,
    focoPuladoNoCiclo: prox.fase === 'foco' ? false : sessao.focoPuladoNoCiclo,
    inicioFaseEm: inicio,
    fimFasePrevistoEm: inicio + duracao,
    pausadaEm: pausada ? agora : null,
    tempoRestanteAoPausarMs: pausada ? duracao : null,
    atualizadaEm: agora,
  };
}

/** Conclusão natural da fase atual (o tempo chegou ao fim). */
function concluirFaseAtual(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  let s = sessao;
  // Um ciclo (foco + pausa) só conta como concluído se nenhuma das duas fases foi pulada.
  if (s.faseAtual !== 'foco' && !s.focoPuladoNoCiclo) {
    s = { ...s, ciclosConcluidos: s.ciclosConcluidos + 1 };
  }
  // A próxima fase começa exatamente quando a anterior terminou (timestamp absoluto).
  return irParaProximaFase(s, sessao.fimFasePrevistoEm, agora);
}

/**
 * RF-12 / UC10 / RN-07 / RN-08: avança a sessão por todas as fases vencidas até `agora`.
 * Usado tanto pelo relógio da interface quanto na reabertura do navegador.
 * Retorna também quantas fases terminaram, para disparar o alerta sonoro (RN-13).
 */
export function sincronizarSessao(
  sessao: SessaoAtiva,
  agora: number,
): { sessao: SessaoAtiva; fasesConcluidas: number } {
  let s = sessao;
  let fasesConcluidas = 0;
  // Limite de segurança: uma sessão tem no máximo 2 × 12 fases.
  for (let i = 0; i < 30 && s.status === 'emAndamento' && agora >= s.fimFasePrevistoEm; i++) {
    s = concluirFaseAtual(s, agora);
    fasesConcluidas++;
  }
  return { sessao: s, fasesConcluidas };
}

/** RF-08 / UC06 / RN-03: pula para a próxima fase sem contabilizar a atual. */
export function pularFase(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status === 'concluida') return sessao;
  const s: SessaoAtiva =
    sessao.faseAtual === 'foco' ? { ...sessao, focoPuladoNoCiclo: true } : sessao;
  return irParaProximaFase(s, agora, agora);
}

/** RF-09 / UC07 / RN-04: volta ao primeiro foco, zera a contagem e mantém o preset. */
export function reiniciarCiclos(sessao: SessaoAtiva, agora: number): SessaoAtiva {
  if (sessao.status === 'concluida') return sessao;
  const duracao = duracaoFaseMs(sessao.snapshotPreset, 'foco');
  const pausada = sessao.status === 'pausada';
  return {
    ...sessao,
    faseAtual: 'foco',
    cicloAtual: 1,
    ciclosConcluidos: 0,
    focoPuladoNoCiclo: false,
    inicioFaseEm: agora,
    fimFasePrevistoEm: agora + duracao,
    pausadaEm: pausada ? agora : null,
    tempoRestanteAoPausarMs: pausada ? duracao : null,
    atualizadaEm: agora,
  };
}

// ---------- Validação do estado persistido (R-03) ----------

const FASES: readonly Fase[] = ['foco', 'pausaCurta', 'pausaLonga'];
const STATUS: readonly StatusSessao[] = ['emAndamento', 'pausada', 'concluida'];

const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ehInteiroEntre = (v: unknown, min: number, max: number) =>
  ehNumero(v) && Number.isInteger(v) && v >= min && v <= max;

export function ehSessaoValida(v: unknown): v is SessaoAtiva {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const snap = s.snapshotPreset as Record<string, unknown> | null | undefined;
  if (typeof snap !== 'object' || snap === null) return false;
  if (
    typeof snap.nome !== 'string' ||
    !ehInteiroEntre(snap.tempoFocoMin, 1, 120) ||
    !ehInteiroEntre(snap.tempoPausaCurtaMin, 1, 60) ||
    !ehInteiroEntre(snap.ciclosAntesPausaLonga, 1, 12) ||
    !ehInteiroEntre(snap.tempoPausaLongaMin, 1, 60)
  )
    return false;
  const totalCiclos = snap.ciclosAntesPausaLonga as number;
  if (typeof s.id !== 'string' || typeof s.presetId !== 'string') return false;
  if (!FASES.includes(s.faseAtual as Fase) || !STATUS.includes(s.status as StatusSessao)) return false;
  if (!ehInteiroEntre(s.cicloAtual, 1, totalCiclos)) return false;
  if (!ehInteiroEntre(s.ciclosConcluidos, 0, totalCiclos)) return false;
  if (typeof s.focoPuladoNoCiclo !== 'boolean') return false;
  if (s.faseAtual === 'pausaLonga' && s.cicloAtual !== totalCiclos) return false;
  if (s.faseAtual === 'pausaCurta' && s.cicloAtual === totalCiclos) return false;
  if (!ehNumero(s.inicioFaseEm) || !ehNumero(s.fimFasePrevistoEm)) return false;
  if (!ehNumero(s.criadaEm) || !ehNumero(s.atualizadaEm)) return false;
  if (s.status === 'pausada') {
    if (!ehNumero(s.pausadaEm) || !ehNumero(s.tempoRestanteAoPausarMs)) return false;
    if ((s.tempoRestanteAoPausarMs as number) < 0) return false;
  } else if (s.pausadaEm !== null || s.tempoRestanteAoPausarMs !== null) {
    return false;
  }
  return true;
}
