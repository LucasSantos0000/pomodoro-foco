import { useCallback, useMemo } from 'react';
import { gerarId } from '../domain/id';
import { atualizarTarefa, criarTarefa, ordenarTarefas } from '../domain/tarefas';
import type { DadosTarefa } from '../domain/tipos';
import { repositorioTarefas } from '../persistence/repositorios';
import { useColecaoPersistida } from './useColecaoPersistida';

export function useTarefas(onErro: (mensagem: string) => void) {
  const [tarefas, atualizar] = useColecaoPersistida(
    repositorioTarefas,
    onErro,
    'As tarefas salvas estavam inconsistentes e foram ignoradas.',
  );

  // RN-10: a ordenação é sempre recalculada a partir da lista persistida
  const ordenadas = useMemo(() => ordenarTarefas(tarefas), [tarefas]);

  const criar = useCallback(
    (dados: DadosTarefa) => atualizar((lista) => [...lista, criarTarefa(dados, gerarId(), Date.now())]),
    [atualizar],
  );

  const editar = useCallback(
    (id: string, dados: DadosTarefa) =>
      atualizar((lista) => lista.map((t) => (t.id === id ? atualizarTarefa(t, dados, Date.now()) : t))),
    [atualizar],
  );

  const excluir = useCallback(
    (id: string) => atualizar((lista) => lista.filter((t) => t.id !== id)),
    [atualizar],
  );

  return { tarefas: ordenadas, criar, editar, excluir };
}
