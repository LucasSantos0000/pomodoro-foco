import { useState } from 'react';
import { ROTULO_ESTADO, ROTULO_PRIORIDADE, TAREFA_PADRAO } from '../domain/tarefas';
import type { DadosTarefa, Tarefa } from '../domain/tipos';
import { useConfirmacao } from './Confirmacao';
import { FormularioTarefa } from './FormularioTarefa';
import { Modal } from './Modal';
import { useNotificacoes } from './Notificacoes';

interface Props {
  tarefas: Tarefa[];
  onCriar: (dados: DadosTarefa) => void;
  onEditar: (id: string, dados: DadosTarefa) => void;
  onExcluir: (id: string) => void;
}

type Edicao = { modo: 'criar' } | { modo: 'editar'; tarefa: Tarefa } | null;

/** RF-15 a RF-19: painel lateral de tarefas, desacoplado do temporizador (RN-09). */
export function PainelTarefas({ tarefas, onCriar, onEditar, onExcluir }: Props) {
  const [edicao, setEdicao] = useState<Edicao>(null);
  const confirmar = useConfirmacao();
  const notificar = useNotificacoes();

  const salvar = (dados: DadosTarefa) => {
    if (!edicao) return;
    if (edicao.modo === 'criar') {
      onCriar(dados);
      notificar('sucesso', 'Tarefa criada.');
    } else {
      onEditar(edicao.tarefa.id, dados);
      notificar('sucesso', 'Tarefa atualizada.');
    }
    setEdicao(null);
  };

  const excluir = async (tarefa: Tarefa) => {
    const ok = await confirmar({
      titulo: 'Excluir tarefa',
      mensagem: `Deseja realmente excluir a tarefa "${tarefa.titulo}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigoso: true,
    });
    if (ok) {
      onExcluir(tarefa.id);
      notificar('sucesso', 'Tarefa excluída.');
    }
  };

  return (
    <aside className="cartao painel-tarefas" aria-labelledby="titulo-tarefas">
      <div className="cartao__cabecalho">
        <h2 id="titulo-tarefas" className="cartao__titulo">
          Tarefas <span className="contador">{tarefas.length}</span>
        </h2>
        <button type="button" className="botao botao--primario botao--pequeno" onClick={() => setEdicao({ modo: 'criar' })}>
          + Nova tarefa
        </button>
      </div>
      <p className="painel-tarefas__legenda">Ordenadas por prioridade e, em seguida, por estado.</p>

      {tarefas.length === 0 ? (
        <p className="vazio">Nenhuma tarefa ainda. Anote aqui o que você pretende estudar.</p>
      ) : (
        <ul className="lista-tarefas">
          {tarefas.map((tarefa) => (
            <li key={tarefa.id} className={`tarefa tarefa--${tarefa.estado}`}>
              <div className="tarefa__conteudo">
                <span className="tarefa__titulo">{tarefa.titulo}</span>
                <span className="tarefa__selos">
                  <span className={`selo selo--prioridade-${tarefa.prioridade}`}>
                    <span className="sr-only">Prioridade: </span>
                    {ROTULO_PRIORIDADE[tarefa.prioridade]}
                  </span>
                  <span className={`selo selo--estado-${tarefa.estado}`}>
                    <span className="sr-only">Estado: </span>
                    {ROTULO_ESTADO[tarefa.estado]}
                  </span>
                </span>
              </div>
              <div className="tarefa__acoes">
                <button
                  type="button"
                  className="botao botao--icone"
                  onClick={() => setEdicao({ modo: 'editar', tarefa })}
                  aria-label={`Editar tarefa ${tarefa.titulo}`}
                  title="Editar"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="botao botao--icone botao--perigo-texto"
                  onClick={() => void excluir(tarefa)}
                  aria-label={`Excluir tarefa ${tarefa.titulo}`}
                  title="Excluir"
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={edicao !== null}
        titulo={edicao?.modo === 'editar' ? 'Editar tarefa' : 'Nova tarefa'}
        onFechar={() => setEdicao(null)}
      >
        {edicao && (
          <FormularioTarefa
            valoresIniciais={
              edicao.modo === 'editar'
                ? { titulo: edicao.tarefa.titulo, estado: edicao.tarefa.estado, prioridade: edicao.tarefa.prioridade }
                : TAREFA_PADRAO
            }
            textoSalvar={edicao.modo === 'editar' ? 'Salvar alterações' : 'Criar tarefa'}
            onSalvar={salvar}
            onCancelar={() => setEdicao(null)}
          />
        )}
      </Modal>
    </aside>
  );
}
