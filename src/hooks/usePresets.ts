import { useCallback } from 'react';
import { gerarId } from '../domain/id';
import { atualizarPreset, criarPreset } from '../domain/presets';
import type { DadosPreset } from '../domain/tipos';
import { repositorioPresets } from '../persistence/repositorios';
import { useColecaoPersistida } from './useColecaoPersistida';

export function usePresets(onErro: (mensagem: string) => void) {
  const [presets, atualizar] = useColecaoPersistida(
    repositorioPresets,
    onErro,
    'Os temporizadores salvos estavam inconsistentes e foram ignorados.',
  );

  const criar = useCallback(
    (dados: DadosPreset) => atualizar((lista) => [...lista, criarPreset(dados, gerarId(), Date.now())]),
    [atualizar],
  );

  const editar = useCallback(
    (id: string, dados: DadosPreset) =>
      atualizar((lista) => lista.map((p) => (p.id === id ? atualizarPreset(p, dados, Date.now()) : p))),
    [atualizar],
  );

  const excluir = useCallback(
    (id: string) => atualizar((lista) => lista.filter((p) => p.id !== id)),
    [atualizar],
  );

  return { presets, criar, editar, excluir };
}
