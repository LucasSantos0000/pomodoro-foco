/**
 * Repositórios: única parte da aplicação que conhece as chaves do localStorage.
 * A interface e os hooks dependem apenas destas funções.
 */
import { ehPresetValido, presetsIniciais } from '../domain/presets';
import { ehSessaoValida } from '../domain/sessao';
import { ehTarefaValida } from '../domain/tarefas';
import { gerarId } from '../domain/id';
import type { Preset, SessaoAtiva, Tarefa } from '../domain/tipos';
import { CHAVES, gravarJson, lerJson, listaDe, removerChave } from './armazenamento';

export interface Carregamento<T> {
  valor: T;
  /** true quando havia dado salvo, mas em formato inválido (R-03). */
  corrompido: boolean;
}

export const repositorioPresets = {
  carregar(): Carregamento<Preset[]> {
    const r = lerJson(CHAVES.presets, listaDe(ehPresetValido));
    if (r.tipo === 'ok') return { valor: r.valor, corrompido: false };
    // Primeiro acesso: oferece presets de exemplo (o usuário pode editá-los ou excluí-los).
    if (r.tipo === 'ausente') {
      const iniciais = presetsIniciais(Date.now(), gerarId);
      try {
        gravarJson(CHAVES.presets, iniciais);
      } catch {
        /* a falha será reportada na próxima gravação feita pelo usuário */
      }
      return { valor: iniciais, corrompido: false };
    }
    return { valor: [], corrompido: true };
  },
  salvar(presets: Preset[]): void {
    gravarJson(CHAVES.presets, presets);
  },
};

export const repositorioTarefas = {
  carregar(): Carregamento<Tarefa[]> {
    const r = lerJson(CHAVES.tarefas, listaDe(ehTarefaValida));
    if (r.tipo === 'ok') return { valor: r.valor, corrompido: false };
    return { valor: [], corrompido: r.tipo === 'corrompido' };
  },
  salvar(tarefas: Tarefa[]): void {
    gravarJson(CHAVES.tarefas, tarefas);
  },
};

export const repositorioSessao = {
  carregar(): Carregamento<SessaoAtiva | null> {
    const r = lerJson(CHAVES.sessaoAtiva, ehSessaoValida);
    if (r.tipo === 'ok') return { valor: r.valor, corrompido: false };
    return { valor: null, corrompido: r.tipo === 'corrompido' };
  },
  salvar(sessao: SessaoAtiva): void {
    gravarJson(CHAVES.sessaoAtiva, sessao);
  },
  remover(): void {
    removerChave(CHAVES.sessaoAtiva);
  },
};
