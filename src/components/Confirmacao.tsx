import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  perigoso?: boolean;
}

type Confirmar = (opcoes: OpcoesConfirmacao) => Promise<boolean>;

const ContextoConfirmacao = createContext<Confirmar | null>(null);

/** Diálogo de confirmação explícita usado em todas as exclusões e encerramentos (RN-11). */
export function ProvedorConfirmacao({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<(OpcoesConfirmacao & { resolver: (v: boolean) => void }) | null>(null);

  const confirmar = useCallback<Confirmar>(
    (opcoes) => new Promise<boolean>((resolver) => setPedido({ ...opcoes, resolver })),
    [],
  );

  const responder = (valor: boolean) => {
    pedido?.resolver(valor);
    setPedido(null);
  };

  return (
    <ContextoConfirmacao.Provider value={confirmar}>
      {children}
      <Modal aberto={pedido !== null} titulo={pedido?.titulo ?? ''} onFechar={() => responder(false)}>
        <p className="modal__texto">{pedido?.mensagem}</p>
        <div className="acoes acoes--fim">
          <button type="button" className="botao botao--secundario" onClick={() => responder(false)} autoFocus>
            Cancelar
          </button>
          <button
            type="button"
            className={`botao ${pedido?.perigoso ? 'botao--perigo' : 'botao--primario'}`}
            onClick={() => responder(true)}
          >
            {pedido?.textoConfirmar ?? 'Confirmar'}
          </button>
        </div>
      </Modal>
    </ContextoConfirmacao.Provider>
  );
}

export function useConfirmacao(): Confirmar {
  const ctx = useContext(ContextoConfirmacao);
  if (!ctx) throw new Error('useConfirmacao deve ser usado dentro de ProvedorConfirmacao');
  return ctx;
}
