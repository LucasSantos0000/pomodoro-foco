import { useId, type ReactNode } from 'react';

interface Props {
  rotulo: string;
  erro?: string;
  dica?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** Rótulo + controle + mensagem de erro por campo (RNF-04, RNF-07). */
export function CampoFormulario({ rotulo, erro, dica, children }: Props) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;
  const descritores = [dica ? idDica : null, erro ? idErro : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`campo${erro ? ' campo--erro' : ''}`}>
      <label htmlFor={id} className="campo__rotulo">
        {rotulo}
      </label>
      {children({ id, 'aria-invalid': Boolean(erro), 'aria-describedby': descritores })}
      {dica && (
        <span id={idDica} className="campo__dica">
          {dica}
        </span>
      )}
      {erro && (
        <span id={idErro} className="campo__erro" role="alert">
          {erro}
        </span>
      )}
    </div>
  );
}
