import { useEffect } from 'react';
import { duracaoFaseMs, ROTULO_FASE, ROTULO_STATUS, tempoRestanteMs } from '../domain/sessao';
import type { Preset, SessaoAtiva } from '../domain/tipos';
import type { ControleSessao } from '../hooks/useSessao';
import { useConfirmacao } from './Confirmacao';

interface Props {
  controle: ControleSessao;
  presets: Preset[];
}

export function formatarTempo(ms: number): string {
  const totalSeg = Math.ceil(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

/** Indicador visual dos ciclos: cada ponto é um ciclo (foco + pausa). */
function IndicadorCiclos({ sessao }: { sessao: SessaoAtiva }) {
  const total = sessao.snapshotPreset.ciclosAntesPausaLonga;
  return (
    <ol className="ciclos" aria-label={`Ciclo ${sessao.cicloAtual} de ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const estado =
          sessao.status === 'concluida' || n < sessao.cicloAtual ? 'passado' : n === sessao.cicloAtual ? 'atual' : 'futuro';
        return <li key={n} className={`ciclos__ponto ciclos__ponto--${estado}`} aria-hidden="true" />;
      })}
    </ol>
  );
}

/** RF-05 a RF-13: exibição e controles da sessão de foco. */
export function Temporizador({ controle, presets }: Props) {
  const { sessao, agora, retomada, corrompida } = controle;
  const confirmar = useConfirmacao();

  const restante = sessao ? tempoRestanteMs(sessao, agora) : 0;

  // Mostra o tempo restante no título da aba
  useEffect(() => {
    if (sessao && sessao.status !== 'concluida') {
      document.title = `${formatarTempo(restante)} · ${ROTULO_FASE[sessao.faseAtual]} – Foco`;
    } else {
      document.title = 'Foco – Pomodoro';
    }
  }, [sessao, restante]);

  if (corrompida) {
    return (
      <section className="cartao temporizador" aria-labelledby="titulo-temporizador">
        <h2 id="titulo-temporizador" className="cartao__titulo">Sessão</h2>
        <div className="faixa faixa--erro" role="alert">
          <p>Os dados da sessão salva estão inconsistentes e não podem ser retomados.</p>
          <button type="button" className="botao botao--perigo botao--pequeno" onClick={controle.descartarDadosCorrompidos}>
            Descartar sessão salva
          </button>
        </div>
      </section>
    );
  }

  if (!sessao) {
    return (
      <section className="cartao temporizador temporizador--vazio" aria-labelledby="titulo-temporizador">
        <h2 id="titulo-temporizador" className="cartao__titulo">Sessão</h2>
        <p className="temporizador__relogio temporizador__relogio--inativo" aria-hidden="true">--:--</p>
        <p className="vazio">Nenhuma sessão ativa. Escolha um temporizador abaixo e clique em <strong>Iniciar</strong>.</p>
      </section>
    );
  }

  const snap = sessao.snapshotPreset;
  const duracao = duracaoFaseMs(snap, sessao.faseAtual);
  const progresso = sessao.status === 'concluida' ? 100 : Math.min(100, Math.max(0, ((duracao - restante) / duracao) * 100));
  const presetOrigem = presets.find((p) => p.id === sessao.presetId);

  const reiniciar = async () => {
    const ok = await confirmar({
      titulo: 'Reiniciar ciclos',
      mensagem: 'A contagem de ciclos será zerada e a sessão voltará ao primeiro foco. Deseja continuar?',
      textoConfirmar: 'Reiniciar',
    });
    if (ok) controle.reiniciar();
  };

  const encerrar = async () => {
    const ok = await confirmar({
      titulo: 'Encerrar sessão',
      mensagem: 'Deseja encerrar a sessão atual? O progresso desta sessão não será mantido.',
      textoConfirmar: 'Encerrar sessão',
      perigoso: true,
    });
    if (ok) controle.encerrar();
  };

  const descartar = async () => {
    const ok = await confirmar({
      titulo: 'Descartar sessão retomada',
      mensagem: 'A sessão restaurada será descartada sem contabilizar progresso. Deseja continuar?',
      textoConfirmar: 'Descartar',
      perigoso: true,
    });
    if (ok) controle.encerrar();
  };

  return (
    <section
      className={`cartao temporizador temporizador--${sessao.faseAtual}`}
      aria-labelledby="titulo-temporizador"
      data-status={sessao.status}
    >
      <div className="cartao__cabecalho">
        <h2 id="titulo-temporizador" className="cartao__titulo">
          {snap.nome}
        </h2>
        <span className={`selo selo--status-${sessao.status}`}>{ROTULO_STATUS[sessao.status]}</span>
      </div>

      {retomada && sessao.status !== 'concluida' && (
        <div className="faixa faixa--info">
          <p>Sessão retomada automaticamente{sessao.status === 'pausada' ? ' (estava pausada)' : ''}.</p>
          <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => void descartar()}>
            Descartar sessão
          </button>
        </div>
      )}

      {sessao.status === 'concluida' ? (
        <div className="temporizador__concluida">
          <p className="temporizador__fase">Sessão concluída 🎉</p>
          <p>
            Ciclos concluídos: <strong>{sessao.ciclosConcluidos}</strong> de {snap.ciclosAntesPausaLonga}
          </p>
          <IndicadorCiclos sessao={sessao} />
          <div className="acoes acoes--centro">
            {presetOrigem && (
              <button type="button" className="botao botao--primario" onClick={() => controle.iniciar(presetOrigem)}>
                Iniciar novamente
              </button>
            )}
            <button type="button" className="botao botao--secundario" onClick={controle.encerrar}>
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="temporizador__fase">{ROTULO_FASE[sessao.faseAtual]}</p>
          <p className="temporizador__relogio" role="timer" aria-label={`Tempo restante: ${formatarTempo(restante)}`}>
            {formatarTempo(restante)}
          </p>
          <div
            className="barra"
            role="progressbar"
            aria-label="Progresso da fase"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progresso)}
          >
            <div className="barra__preenchimento" style={{ width: `${progresso}%` }} />
          </div>
          <p className="temporizador__ciclo">
            Ciclo {sessao.cicloAtual} de {snap.ciclosAntesPausaLonga} · Ciclos concluídos: {sessao.ciclosConcluidos}
          </p>
          <IndicadorCiclos sessao={sessao} />

          <div className="acoes acoes--centro controles">
            {sessao.status === 'emAndamento' ? (
              <button type="button" className="botao botao--primario botao--grande" onClick={controle.pausar}>
                Pausar
              </button>
            ) : (
              <button type="button" className="botao botao--primario botao--grande" onClick={controle.retomar}>
                Retomar
              </button>
            )}
            <button type="button" className="botao botao--secundario" onClick={controle.pular}>
              Pular fase
            </button>
            <button type="button" className="botao botao--secundario" onClick={() => void reiniciar()}>
              Reiniciar ciclos
            </button>
            <button type="button" className="botao botao--perigo-texto" onClick={() => void encerrar()}>
              Encerrar sessão
            </button>
          </div>
        </>
      )}
    </section>
  );
}
