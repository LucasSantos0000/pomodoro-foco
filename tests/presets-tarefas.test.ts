import { describe, expect, it } from 'vitest';
import { FORMULARIO_PRESET_PADRAO, validarPreset } from '../src/domain/presets';
import { criarTarefa, ordenarTarefas, TAREFA_PADRAO, validarTarefa } from '../src/domain/tarefas';
import type { EstadoTarefa, Prioridade } from '../src/domain/tipos';

describe('validação de preset (VR-01 a VR-05)', () => {
  const valido = { ...FORMULARIO_PRESET_PADRAO, nome: 'Estudo' };

  it('aceita valores válidos e converte para números', () => {
    const r = validarPreset(valido);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valores.tempoFocoMin).toBe(25);
  });

  it('exige nome entre 1 e 40 caracteres', () => {
    expect(validarPreset({ ...valido, nome: '   ' }).ok).toBe(false);
    expect(validarPreset({ ...valido, nome: 'a'.repeat(41) }).ok).toBe(false);
    expect(validarPreset({ ...valido, nome: 'a'.repeat(40) }).ok).toBe(true);
  });

  it('rejeita valores fora dos limites ou não inteiros, com mensagem por campo', () => {
    const r = validarPreset({ ...valido, tempoFocoMin: '121', tempoPausaCurtaMin: '0', ciclosAntesPausaLonga: '2.5', tempoPausaLongaMin: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erros.tempoFocoMin).toMatch(/1 e 120/);
      expect(r.erros.tempoPausaCurtaMin).toMatch(/1 e 60/);
      expect(r.erros.ciclosAntesPausaLonga).toMatch(/inteiro/);
      expect(r.erros.tempoPausaLongaMin).toMatch(/obrigatório/);
    }
  });
});

describe('tarefas', () => {
  it('padrão é backlog com prioridade média (RN-12)', () => {
    expect(TAREFA_PADRAO.estado).toBe('backlog');
    expect(TAREFA_PADRAO.prioridade).toBe('media');
  });

  it('valida título obrigatório até 100 caracteres (VR-06)', () => {
    expect(validarTarefa({ ...TAREFA_PADRAO, titulo: '' }).ok).toBe(false);
    expect(validarTarefa({ ...TAREFA_PADRAO, titulo: 'x'.repeat(101) }).ok).toBe(false);
    expect(validarTarefa({ ...TAREFA_PADRAO, titulo: 'Ler capítulo 3' }).ok).toBe(true);
  });

  it('ordena por prioridade e depois por estado (RN-10)', () => {
    let t = 0;
    const nova = (titulo: string, prioridade: Prioridade, estado: EstadoTarefa) =>
      criarTarefa({ titulo, prioridade, estado }, titulo, t++);
    const ordenadas = ordenarTarefas([
      nova('baixa-afazer', 'baixa', 'aFazer'),
      nova('alta-backlog', 'alta', 'backlog'),
      nova('alta-cancelada', 'alta', 'cancelada'),
      nova('media-execucao', 'media', 'emExecucao'),
      nova('alta-afazer', 'alta', 'aFazer'),
      nova('alta-concluida', 'alta', 'concluida'),
      nova('alta-execucao', 'alta', 'emExecucao'),
    ]);
    expect(ordenadas.map((x) => x.titulo)).toEqual([
      'alta-afazer',
      'alta-execucao',
      'alta-concluida',
      'alta-cancelada',
      'alta-backlog',
      'media-execucao',
      'baixa-afazer',
    ]);
  });
});
