import { useCallback } from 'react';
import { ProvedorConfirmacao } from './components/Confirmacao';
import { ListaPresets } from './components/ListaPresets';
import { ProvedorNotificacoes, useNotificacoes } from './components/Notificacoes';
import { PainelTarefas } from './components/PainelTarefas';
import { Temporizador } from './components/Temporizador';
import { usePresets } from './hooks/usePresets';
import { useSessao } from './hooks/useSessao';
import { useTarefas } from './hooks/useTarefas';

function Aplicacao() {
  const notificar = useNotificacoes();
  const onErro = useCallback((m: string) => notificar('erro', m), [notificar]);
  const onAviso = useCallback((m: string) => notificar('aviso', m), [notificar]);

  const { presets, criar, editar, excluir } = usePresets(onErro);
  const tarefas = useTarefas(onErro);
  const sessao = useSessao({ onErro, onAviso });

  const fase = sessao.sessao && sessao.sessao.status !== 'concluida' ? sessao.sessao.faseAtual : 'inativa';

  return (
    <div className="app" data-fase={fase}>
      <header className="topo">
        <h1 className="topo__titulo">
          <span aria-hidden="true">🍅</span> Foco
        </h1>
        <p className="topo__subtitulo">Temporizador Pomodoro para seus ciclos de estudo</p>
      </header>

      <main className="layout">
        <div className="layout__principal">
          <Temporizador controle={sessao} presets={presets} />
          <ListaPresets
            presets={presets}
            sessao={sessao.sessao}
            onIniciar={sessao.iniciar}
            onCriar={criar}
            onEditar={editar}
            onExcluir={excluir}
          />
        </div>
        <PainelTarefas
          tarefas={tarefas.tarefas}
          onCriar={tarefas.criar}
          onEditar={tarefas.editar}
          onExcluir={tarefas.excluir}
        />
      </main>

      <footer className="rodape">Os dados ficam salvos apenas neste navegador.</footer>
    </div>
  );
}

export default function App() {
  return (
    <ProvedorNotificacoes>
      <ProvedorConfirmacao>
        <Aplicacao />
      </ProvedorConfirmacao>
    </ProvedorNotificacoes>
  );
}
