import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type TipoNotificacao = 'erro' | 'aviso' | 'sucesso';

interface Notificacao {
  id: number;
  tipo: TipoNotificacao;
  texto: string;
}

type Notificar = (tipo: TipoNotificacao, texto: string) => void;

const ContextoNotificacoes = createContext<Notificar | null>(null);

/** Mensagens temporárias de feedback (salvamentos, falhas de persistência, avisos). */
export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Notificacao[]>([]);
  const proximoId = useRef(1);

  const fechar = useCallback((id: number) => setItens((l) => l.filter((n) => n.id !== id)), []);

  const notificar = useCallback<Notificar>(
    (tipo, texto) => {
      const id = proximoId.current++;
      setItens((l) => [...l.slice(-3), { id, tipo, texto }]);
      window.setTimeout(() => fechar(id), tipo === 'erro' ? 9000 : 4500);
    },
    [fechar],
  );

  return (
    <ContextoNotificacoes.Provider value={notificar}>
      {children}
      <div className="notificacoes" aria-live="polite">
        {itens.map((n) => (
          <div key={n.id} className={`notificacao notificacao--${n.tipo}`} role={n.tipo === 'erro' ? 'alert' : 'status'}>
            <span>{n.texto}</span>
            <button type="button" className="notificacao__fechar" aria-label="Fechar mensagem" onClick={() => fechar(n.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ContextoNotificacoes.Provider>
  );
}

export function useNotificacoes(): Notificar {
  const ctx = useContext(ContextoNotificacoes);
  if (!ctx) throw new Error('useNotificacoes deve ser usado dentro de ProvedorNotificacoes');
  return ctx;
}
