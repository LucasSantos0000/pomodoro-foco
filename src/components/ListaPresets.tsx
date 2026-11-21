import { useState } from 'react';
import { FORMULARIO_PRESET_PADRAO, presetParaFormulario } from '../domain/presets';
import { sessaoBloqueiaPreset } from '../domain/sessao';
import type { DadosPreset, Preset, SessaoAtiva } from '../domain/tipos';
import { useConfirmacao } from './Confirmacao';
import { FormularioPreset } from './FormularioPreset';
import { Modal } from './Modal';
import { useNotificacoes } from './Notificacoes';

interface Props {
  presets: Preset[];
  sessao: SessaoAtiva | null;
  onIniciar: (preset: Preset) => void;
  onCriar: (dados: DadosPreset) => void;
  onEditar: (id: string, dados: DadosPreset) => void;
  onExcluir: (id: string) => void;
}

type Edicao = { modo: 'criar' } | { modo: 'editar'; preset: Preset } | null;

/** RF-01 a RF-05 e RF-11: lista, criação, edição, exclusão e início/troca de temporizadores. */
export function ListaPresets({ presets, sessao, onIniciar, onCriar, onEditar, onExcluir }: Props) {
  const [edicao, setEdicao] = useState<Edicao>(null);
  const confirmar = useConfirmacao();
  const notificar = useNotificacoes();
  const haSessaoAtiva = sessao !== null && sessao.status !== 'concluida';

  const salvar = (dados: DadosPreset) => {
    if (!edicao) return;
    if (edicao.modo === 'criar') {
      onCriar(dados);
      notificar('sucesso', `Temporizador "${dados.nome}" criado.`);
    } else {
      onEditar(edicao.preset.id, dados);
      notificar('sucesso', `Temporizador "${dados.nome}" atualizado.`);
    }
    setEdicao(null);
  };

  const excluir = async (preset: Preset) => {
    if (sessaoBloqueiaPreset(sessao, preset.id)) return; // RN-01
    const ok = await confirmar({
      titulo: 'Excluir temporizador',
      mensagem: `Deseja realmente excluir o temporizador "${preset.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigoso: true,
    });
    if (ok) {
      onExcluir(preset.id);
      notificar('sucesso', `Temporizador "${preset.nome}" excluído.`);
    }
  };

  return (
    <section className="cartao" aria-labelledby="titulo-presets">
      <div className="cartao__cabecalho">
        <h2 id="titulo-presets" className="cartao__titulo">
          Temporizadores
        </h2>
        <button type="button" className="botao botao--primario botao--pequeno" onClick={() => setEdicao({ modo: 'criar' })}>
          + Novo temporizador
        </button>
      </div>

      {presets.length === 0 ? (
        <p className="vazio">Nenhum temporizador cadastrado. Crie um para começar a estudar.</p>
      ) : (
        <ul className="lista-presets">
          {presets.map((preset) => {
            const emUso = sessaoBloqueiaPreset(sessao, preset.id);
            const idAviso = `aviso-preset-${preset.id}`;
            return (
              <li key={preset.id} className={`preset${emUso ? ' preset--em-uso' : ''}`}>
                <div className="preset__info">
                  <h3 className="preset__nome">
                    {preset.nome}
                    {emUso && <span className="selo selo--destaque">Em uso</span>}
                  </h3>
                  <dl className="preset__parametros">
                    <div><dt>Foco</dt><dd>{preset.tempoFocoMin} min</dd></div>
                    <div><dt>Pausa curta</dt><dd>{preset.tempoPausaCurtaMin} min</dd></div>
                    <div><dt>Pausa longa</dt><dd>{preset.tempoPausaLongaMin} min</dd></div>
                    <div><dt>Ciclos</dt><dd>{preset.ciclosAntesPausaLonga}</dd></div>
                  </dl>
                  {emUso && (
                    <p id={idAviso} className="preset__aviso">
                      Em uso pela sessão ativa: encerre a sessão para editar ou excluir.
                    </p>
                  )}
                </div>
                <div className="preset__acoes">
                  {!emUso && (
                    <button
                      type="button"
                      className="botao botao--primario botao--pequeno"
                      onClick={() => onIniciar(preset)}
                      aria-label={`${haSessaoAtiva ? 'Trocar para' : 'Iniciar'} ${preset.nome}`}
                      title={haSessaoAtiva ? 'Encerra a sessão atual e inicia este temporizador' : undefined}
                    >
                      {haSessaoAtiva ? 'Trocar' : 'Iniciar'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="botao botao--secundario botao--pequeno"
                    onClick={() => setEdicao({ modo: 'editar', preset })}
                    disabled={emUso}
                    aria-describedby={emUso ? idAviso : undefined}
                    aria-label={`Editar ${preset.nome}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="botao botao--perigo-texto botao--pequeno"
                    onClick={() => void excluir(preset)}
                    disabled={emUso}
                    aria-describedby={emUso ? idAviso : undefined}
                    aria-label={`Excluir ${preset.nome}`}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        aberto={edicao !== null}
        titulo={edicao?.modo === 'editar' ? 'Editar temporizador' : 'Novo temporizador'}
        onFechar={() => setEdicao(null)}
      >
        {edicao && (
          <FormularioPreset
            valoresIniciais={edicao.modo === 'editar' ? presetParaFormulario(edicao.preset) : FORMULARIO_PRESET_PADRAO}
            textoSalvar={edicao.modo === 'editar' ? 'Salvar alterações' : 'Criar temporizador'}
            onSalvar={salvar}
            onCancelar={() => setEdicao(null)}
          />
        )}
      </Modal>
    </section>
  );
}
