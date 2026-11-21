import { useRef, useState, type FormEvent } from 'react';
import { LIMITES_PRESET, validarPreset, type FormularioPreset as Valores } from '../domain/presets';
import type { DadosPreset } from '../domain/tipos';
import { CampoFormulario } from './CampoFormulario';

interface Props {
  valoresIniciais: Valores;
  textoSalvar: string;
  onSalvar: (dados: DadosPreset) => void;
  onCancelar: () => void;
}

const CAMPOS_NUMERICOS: { campo: Exclude<keyof Valores, 'nome'>; rotulo: string; unidade: string }[] = [
  { campo: 'tempoFocoMin', rotulo: 'Tempo de foco', unidade: 'minutos' },
  { campo: 'tempoPausaCurtaMin', rotulo: 'Pausa curta', unidade: 'minutos' },
  { campo: 'ciclosAntesPausaLonga', rotulo: 'Ciclos antes da pausa longa', unidade: 'ciclos' },
  { campo: 'tempoPausaLongaMin', rotulo: 'Pausa longa', unidade: 'minutos' },
];

/** UC01 / UC02: formulário de criação e edição de temporizador. */
export function FormularioPreset({ valoresIniciais, textoSalvar, onSalvar, onCancelar }: Props) {
  const [valores, setValores] = useState<Valores>(valoresIniciais);
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({});
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const alterar = (campo: keyof Valores, valor: string) => {
    const novos = { ...valores, [campo]: valor };
    setValores(novos);
    if (tentouSalvar) {
      const r = validarPreset(novos);
      setErros(r.ok ? {} : r.erros);
    }
  };

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTentouSalvar(true);
    const r = validarPreset(valores);
    if (!r.ok) {
      setErros(r.erros);
      // leva o foco ao primeiro campo inválido
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    onSalvar(r.valores);
  };

  return (
    <form ref={formRef} className="formulario" onSubmit={enviar} noValidate>
      <CampoFormulario rotulo="Nome" erro={erros.nome} dica={`De 1 a ${LIMITES_PRESET.nome.max} caracteres.`}>
        {(a11y) => (
          <input
            {...a11y}
            type="text"
            className="entrada"
            value={valores.nome}
            onChange={(e) => alterar('nome', e.target.value)}
            autoComplete="off"
            autoFocus
          />
        )}
      </CampoFormulario>

      <div className="formulario__grade">
        {CAMPOS_NUMERICOS.map(({ campo, rotulo, unidade }) => {
          const { min, max } = LIMITES_PRESET[campo];
          return (
            <CampoFormulario key={campo} rotulo={rotulo} erro={erros[campo]} dica={`${min} a ${max} ${unidade}`}>
              {(a11y) => (
                <input
                  {...a11y}
                  type="number"
                  inputMode="numeric"
                  className="entrada"
                  min={min}
                  max={max}
                  step={1}
                  value={valores[campo]}
                  onChange={(e) => alterar(campo, e.target.value)}
                />
              )}
            </CampoFormulario>
          );
        })}
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
