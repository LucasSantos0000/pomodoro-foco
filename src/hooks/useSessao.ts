import { useCallback, useEffect, useRef, useState } from 'react';
import { prepararAudio, tocarAlerta } from '../audio/alerta';
import { gerarId } from '../domain/id';
import {
  iniciarSessao,
  pausarSessao,
  pularFase,
  reiniciarCiclos,
  retomarSessao,
  sincronizarSessao,
} from '../domain/sessao';
import type { Preset, SessaoAtiva } from '../domain/tipos';
import { repositorioSessao } from '../persistence/repositorios';

interface EstadoInicial {
  sessao: SessaoAtiva | null;
  /** A sessão foi restaurada automaticamente ao abrir a aplicação (UC10). */
  retomada: boolean;
  /** Havia uma sessão salva, mas inconsistente (R-03). */
  corrompida: boolean;
  /** Fases que venceram enquanto o navegador estava fechado. */
  fasesVencidas: number;
}

/** UC10: lê a sessão persistida e recalcula pelo relógio atual. */
function carregarSessao(): EstadoInicial {
  const { valor, corrompido } = repositorioSessao.carregar();
  if (!valor) return { sessao: null, retomada: false, corrompida: corrompido, fasesVencidas: 0 };

  // RN-06: sessão pausada volta pausada, sem avanço. RN-07/RN-08: em andamento é recalculada.
  const { sessao, fasesConcluidas } = sincronizarSessao(valor, Date.now());
  if (fasesConcluidas > 0) {
    try {
      repositorioSessao.salvar(sessao);
    } catch {
      /* reportado na próxima ação do usuário */
    }
  }
  return { sessao, retomada: true, corrompida: false, fasesVencidas: fasesConcluidas };
}

export interface CallbacksSessao {
  onErro: (mensagem: string) => void;
  onAviso: (mensagem: string) => void;
}

export function useSessao({ onErro, onAviso }: CallbacksSessao) {
  const [inicial] = useState(carregarSessao);
  const [sessao, setSessao] = useState<SessaoAtiva | null>(inicial.sessao);
  const [retomada, setRetomada] = useState(inicial.retomada);
  const [corrompida, setCorrompida] = useState(inicial.corrompida);
  const [agora, setAgora] = useState(() => Date.now());

  // Refs evitam closures desatualizadas dentro do intervalo do relógio.
  const sessaoRef = useRef(sessao);
  const callbacksRef = useRef({ onErro, onAviso });
  callbacksRef.current = { onErro, onAviso };

  const definir = useCallback((nova: SessaoAtiva | null) => {
    sessaoRef.current = nova;
    setSessao(nova);
    setAgora(Date.now());
    try {
      if (nova) repositorioSessao.salvar(nova);
      else repositorioSessao.remover();
    } catch (e) {
      callbacksRef.current.onErro(
        e instanceof Error ? `${e.message} A sessão pode não ser retomada após fechar o navegador.` : 'Falha ao salvar a sessão.',
      );
    }
  }, []);

  // Alerta pelas fases que venceram com o navegador fechado (pode ser bloqueado pelo autoplay).
  const alertaInicialRef = useRef(false);
  useEffect(() => {
    if (alertaInicialRef.current) return;
    alertaInicialRef.current = true;
    if (inicial.fasesVencidas > 0) {
      tocarAlerta();
      callbacksRef.current.onAviso(
        inicial.sessao?.status === 'concluida'
          ? 'A sessão terminou enquanto o navegador estava fechado.'
          : `Sessão retomada: ${inicial.fasesVencidas} fase(s) terminaram enquanto o navegador estava fechado.`,
      );
    }
    if (inicial.corrompida) {
      callbacksRef.current.onErro('Os dados da sessão salva estão inconsistentes e não puderam ser restaurados.');
    }
  }, [inicial]);

  // Relógio: recalcula pelo timestamp absoluto a cada 250 ms e ao voltar para a aba (R-02).
  const status = sessao?.status;
  useEffect(() => {
    if (status !== 'emAndamento') return;
    const tick = () => {
      const t = Date.now();
      setAgora(t);
      const atual = sessaoRef.current;
      if (atual && atual.status === 'emAndamento' && t >= atual.fimFasePrevistoEm) {
        const { sessao: nova, fasesConcluidas } = sincronizarSessao(atual, t);
        if (fasesConcluidas > 0) {
          tocarAlerta(); // RN-13
          definir(nova);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [status, definir]);

  /** Aplica uma transição sobre o estado já sincronizado com o relógio. */
  const transicao = useCallback(
    (fn: (s: SessaoAtiva, agora: number) => SessaoAtiva) => {
      const atual = sessaoRef.current;
      if (!atual) return;
      const t = Date.now();
      const sincronizada = sincronizarSessao(atual, t).sessao;
      definir(fn(sincronizada, t));
    },
    [definir],
  );

  const iniciar = useCallback(
    (preset: Preset) => {
      prepararAudio(); // R-01: libera o áudio no clique do usuário
      const anterior = sessaoRef.current;
      if (anterior && anterior.status !== 'concluida' && anterior.presetId !== preset.id) {
        // RN-02: troca de preset encerra a sessão em andamento sem confirmação adicional
        callbacksRef.current.onAviso(`Sessão de "${anterior.snapshotPreset.nome}" encerrada para iniciar "${preset.nome}".`);
      }
      setRetomada(false);
      definir(iniciarSessao(preset, gerarId(), Date.now()));
    },
    [definir],
  );

  const pausar = useCallback(() => transicao(pausarSessao), [transicao]);
  const retomar = useCallback(() => {
    prepararAudio();
    transicao(retomarSessao);
  }, [transicao]);
  const pular = useCallback(() => transicao(pularFase), [transicao]);
  const reiniciar = useCallback(() => transicao(reiniciarCiclos), [transicao]);

  /** Encerrar (UC08), descartar sessão retomada (UC11) ou fechar sessão concluída. */
  const encerrar = useCallback(() => {
    setRetomada(false);
    definir(null);
  }, [definir]);

  const descartarDadosCorrompidos = useCallback(() => {
    setCorrompida(false);
    definir(null);
  }, [definir]);

  return {
    sessao,
    agora,
    retomada,
    corrompida,
    iniciar,
    pausar,
    retomar,
    pular,
    reiniciar,
    encerrar,
    descartarDadosCorrompidos,
  };
}

export type ControleSessao = ReturnType<typeof useSessao>;
