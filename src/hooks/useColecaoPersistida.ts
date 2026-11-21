import { useCallback, useEffect, useRef, useState } from 'react';
import type { Carregamento } from '../persistence/repositorios';

interface Repositorio<T> {
  carregar(): Carregamento<T[]>;
  salvar(itens: T[]): void;
}

/**
 * Estado React de uma lista persistida em localStorage.
 * Toda alteração é gravada imediatamente; falhas são reportadas via onErro (RNF-06).
 */
export function useColecaoPersistida<T>(
  repositorio: Repositorio<T>,
  onErro: (mensagem: string) => void,
  mensagemCorrompido: string,
) {
  const [inicial] = useState(() => repositorio.carregar());
  const [itens, setItens] = useState<T[]>(inicial.valor);
  const itensRef = useRef(itens);
  const onErroRef = useRef(onErro);
  onErroRef.current = onErro;

  const avisouRef = useRef(false);
  useEffect(() => {
    if (inicial.corrompido && !avisouRef.current) {
      avisouRef.current = true;
      onErroRef.current(mensagemCorrompido);
    }
  }, [inicial, mensagemCorrompido]);

  const atualizar = useCallback(
    (fn: (atuais: T[]) => T[]) => {
      const novos = fn(itensRef.current);
      itensRef.current = novos;
      setItens(novos);
      try {
        repositorio.salvar(novos);
      } catch (e) {
        onErroRef.current(e instanceof Error ? e.message : 'Falha ao salvar os dados.');
      }
    },
    [repositorio],
  );

  return [itens, atualizar] as const;
}
