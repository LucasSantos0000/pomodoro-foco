import { describe, expect, it } from 'vitest';
import {
  ehSessaoValida,
  iniciarSessao,
  pausarSessao,
  pularFase,
  reiniciarCiclos,
  retomarSessao,
  sincronizarSessao,
  tempoRestanteMs,
} from '../src/domain/sessao';
import { criarPreset } from '../src/domain/presets';

const MIN = 60_000;
const T0 = 1_700_000_000_000;
// foco 25, pausa curta 5, 2 ciclos, pausa longa 15 → total 25+5+25+15 = 70 min
const preset = criarPreset(
  { nome: 'Teste', tempoFocoMin: 25, tempoPausaCurtaMin: 5, ciclosAntesPausaLonga: 2, tempoPausaLongaMin: 15 },
  'p1',
  T0,
);

describe('início da sessão (UC04)', () => {
  it('começa em foco, ciclo 1, com fim calculado por timestamp', () => {
    const s = iniciarSessao(preset, 's1', T0);
    expect(s.faseAtual).toBe('foco');
    expect(s.cicloAtual).toBe(1);
    expect(s.status).toBe('emAndamento');
    expect(s.fimFasePrevistoEm).toBe(T0 + 25 * MIN);
    expect(ehSessaoValida(s)).toBe(true);
  });

  it('usa snapshot imune a edições posteriores do preset (RN-05)', () => {
    const s = iniciarSessao(preset, 's1', T0);
    preset.tempoFocoMin = 99; // simula edição posterior
    expect(s.snapshotPreset.tempoFocoMin).toBe(25);
    preset.tempoFocoMin = 25;
  });
});

describe('pausar e retomar (UC05)', () => {
  it('preserva o tempo restante e recalcula o fim a partir da retomada', () => {
    let s = iniciarSessao(preset, 's1', T0);
    s = pausarSessao(s, T0 + 10 * MIN);
    expect(s.status).toBe('pausada');
    expect(s.tempoRestanteAoPausarMs).toBe(15 * MIN);
    // muito tempo depois, continua com o mesmo restante
    expect(tempoRestanteMs(s, T0 + 500 * MIN)).toBe(15 * MIN);
    s = retomarSessao(s, T0 + 100 * MIN);
    expect(s.status).toBe('emAndamento');
    expect(s.fimFasePrevistoEm).toBe(T0 + 115 * MIN);
  });

  it('sessão pausada não avança ao sincronizar (RN-06)', () => {
    const s = pausarSessao(iniciarSessao(preset, 's1', T0), T0 + MIN);
    const r = sincronizarSessao(s, T0 + 1000 * MIN);
    expect(r.fasesConcluidas).toBe(0);
    expect(r.sessao).toEqual(s);
  });
});

describe('recálculo por timestamp (UC10)', () => {
  it('mantém a fase se ainda não venceu', () => {
    const s = iniciarSessao(preset, 's1', T0);
    const r = sincronizarSessao(s, T0 + 20 * MIN);
    expect(r.fasesConcluidas).toBe(0);
    expect(tempoRestanteMs(r.sessao, T0 + 20 * MIN)).toBe(5 * MIN);
  });

  it('avança várias fases vencidas encadeando os timestamps (RN-07)', () => {
    const s = iniciarSessao(preset, 's1', T0);
    // 25 foco + 5 pausa + 10 min do segundo foco
    const r = sincronizarSessao(s, T0 + 40 * MIN);
    expect(r.fasesConcluidas).toBe(2);
    expect(r.sessao.faseAtual).toBe('foco');
    expect(r.sessao.cicloAtual).toBe(2);
    expect(r.sessao.ciclosConcluidos).toBe(1);
    expect(r.sessao.inicioFaseEm).toBe(T0 + 30 * MIN);
    expect(tempoRestanteMs(r.sessao, T0 + 40 * MIN)).toBe(15 * MIN);
  });

  it('após o último foco vem a pausa longa', () => {
    const r = sincronizarSessao(iniciarSessao(preset, 's1', T0), T0 + 56 * MIN);
    expect(r.sessao.faseAtual).toBe('pausaLonga');
    expect(r.sessao.cicloAtual).toBe(2);
  });

  it('conclui a sessão se todas as fases venceram (RN-08)', () => {
    const r = sincronizarSessao(iniciarSessao(preset, 's1', T0), T0 + 300 * MIN);
    expect(r.sessao.status).toBe('concluida');
    expect(r.sessao.ciclosConcluidos).toBe(2);
    expect(r.fasesConcluidas).toBe(4);
    expect(ehSessaoValida(r.sessao)).toBe(true);
  });
});

describe('pular fase (UC06, RN-03)', () => {
  it('pular foco não incrementa a contagem de ciclos', () => {
    let s = iniciarSessao(preset, 's1', T0);
    s = pularFase(s, T0 + MIN); // vai para pausa curta
    expect(s.faseAtual).toBe('pausaCurta');
    s = sincronizarSessao(s, T0 + 6 * MIN).sessao; // pausa termina naturalmente
    expect(s.faseAtual).toBe('foco');
    expect(s.cicloAtual).toBe(2);
    expect(s.ciclosConcluidos).toBe(0);
  });

  it('pular pausa não incrementa a contagem de ciclos', () => {
    let s = iniciarSessao(preset, 's1', T0);
    s = sincronizarSessao(s, T0 + 25 * MIN).sessao; // foco concluído
    expect(s.faseAtual).toBe('pausaCurta');
    s = pularFase(s, T0 + 26 * MIN);
    expect(s.faseAtual).toBe('foco');
    expect(s.ciclosConcluidos).toBe(0);
    expect(s.fimFasePrevistoEm).toBe(T0 + 51 * MIN);
  });

  it('pular a última fase encerra a sessão', () => {
    let s = sincronizarSessao(iniciarSessao(preset, 's1', T0), T0 + 56 * MIN).sessao;
    s = pularFase(s, T0 + 57 * MIN);
    expect(s.status).toBe('concluida');
  });

  it('pular com a sessão pausada mantém pausada com o tempo cheio da próxima fase', () => {
    let s = pausarSessao(iniciarSessao(preset, 's1', T0), T0 + MIN);
    s = pularFase(s, T0 + 2 * MIN);
    expect(s.status).toBe('pausada');
    expect(s.tempoRestanteAoPausarMs).toBe(5 * MIN);
    expect(ehSessaoValida(s)).toBe(true);
  });
});

describe('reiniciar ciclos (UC07, RN-04)', () => {
  it('volta ao primeiro foco e zera a contagem, mantendo o preset', () => {
    let s = sincronizarSessao(iniciarSessao(preset, 's1', T0), T0 + 40 * MIN).sessao;
    s = reiniciarCiclos(s, T0 + 41 * MIN);
    expect(s.faseAtual).toBe('foco');
    expect(s.cicloAtual).toBe(1);
    expect(s.ciclosConcluidos).toBe(0);
    expect(s.presetId).toBe('p1');
    expect(s.fimFasePrevistoEm).toBe(T0 + 66 * MIN);
  });
});

describe('validação do estado persistido (R-03)', () => {
  it('rejeita dados inconsistentes', () => {
    const s = iniciarSessao(preset, 's1', T0);
    expect(ehSessaoValida(null)).toBe(false);
    expect(ehSessaoValida({ ...s, faseAtual: 'almoço' })).toBe(false);
    expect(ehSessaoValida({ ...s, cicloAtual: 7 })).toBe(false);
    expect(ehSessaoValida({ ...s, status: 'pausada' })).toBe(false); // sem tempo restante
  });
});
