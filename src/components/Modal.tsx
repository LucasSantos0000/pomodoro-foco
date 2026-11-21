import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

/**
 * Janela modal baseada no elemento nativo <dialog>, que já oferece foco preso,
 * fechamento com Esc e semântica acessível (RNF-07).
 */
export function Modal({ aberto, titulo, onFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault(); // o estado React decide quando fechar
        onFechar();
      }}
    >
      {aberto && (
        <>
          <h2 id={idTitulo} className="modal__titulo">
            {titulo}
          </h2>
          {children}
        </>
      )}
    </dialog>
  );
}
