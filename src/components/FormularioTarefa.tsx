import { useRef, useState, type FormEvent } from 'react';
import { ESTADOS, LIMITE_TITULO, PRIORIDADES, ROTULO_ESTADO, ROTULO_PRIORIDADE, validarTarefa } from '../domain/tarefas';
import type { DadosTarefa, EstadoTarefa, Prioridade } from '../domain/tipos';
import { CampoFormulario } from './CampoFormulario';

interface Props {
  valoresIniciais: DadosTarefa;
  textoSalvar: string;
  onSalvar: (dados: DadosTarefa) => void;
  onCancelar: () => void;
}

/** UC12 / UC13: formulário de criação e edição de tarefa. */
export function FormularioTarefa({ valoresIniciais, textoSalvar, onSalvar, onCancelar }: Props) {
  const [valores, setValores] = useState<DadosTarefa>(valoresIniciais);
  const [erros, setErros] = useState<Partial<Record<keyof DadosTarefa, string>>>({});
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const alterar = <K extends keyof DadosTarefa>(campo: K, valor: DadosTarefa[K]) => {
    const novos = { ...valores, [campo]: valor };
    setValores(novos);
    if (tentouSalvar) {
      const r = validarTarefa(novos);
      setErros(r.ok ? {} : r.erros);
    }
  };

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTentouSalvar(true);
    const r = validarTarefa(valores);
    if (!r.ok) {
      setErros(r.erros);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSalvar(r.valores);
  };

  const tamanho = valores.titulo.trim().length;

  return (
    <form ref={formRef} className="formulario" onSubmit={enviar} noValidate>
      <CampoFormulario rotulo="Título" erro={erros.titulo} dica={`${tamanho}/${LIMITE_TITULO} caracteres`}>
        {(a11y) => (
          <input
            {...a11y}
            type="text"
            className="entrada"
            value={valores.titulo}
            onChange={(e) => alterar('titulo', e.target.value)}
            autoComplete="off"
            autoFocus
          />
        )}
      </CampoFormulario>

      <div className="formulario__grade">
        <CampoFormulario rotulo="Estado" erro={erros.estado}>
          {(a11y) => (
            <select
              {...a11y}
              className="entrada"
              value={valores.estado}
              onChange={(e) => alterar('estado', e.target.value as EstadoTarefa)}
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {ROTULO_ESTADO[estado]}
                </option>
              ))}
            </select>
          )}
        </CampoFormulario>

        <CampoFormulario rotulo="Prioridade" erro={erros.prioridade}>
          {(a11y) => (
            <select
              {...a11y}
              className="entrada"
              value={valores.prioridade}
              onChange={(e) => alterar('prioridade', e.target.value as Prioridade)}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PRIORIDADE[p]}
                </option>
              ))}
            </select>
          )}
        </CampoFormulario>
      </div>

      <div className="acoes acoes--fim">
        <button type="button" className="botao botao--secundario" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--primario">
          {textoSalvar}
        </button>
      </div>
    </form>
  );
}
