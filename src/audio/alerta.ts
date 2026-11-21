/**
 * Alerta sonoro gerado com a Web Audio API (sem arquivos de áudio).
 *
 * Navegadores só liberam a reprodução de som depois de uma interação do usuário (R-01).
 * Por isso prepararAudio() é chamado nos cliques de "Iniciar" e "Retomar": o
 * AudioContext é criado/retomado nesse momento e fica ativo para os alertas seguintes.
 */

type ConstrutorAudioContext = typeof AudioContext;

let contexto: AudioContext | null = null;

function obterConstrutor(): ConstrutorAudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: ConstrutorAudioContext; webkitAudioContext?: ConstrutorAudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Deve ser chamado dentro de um manipulador de clique. */
export function prepararAudio(): void {
  const Construtor = obterConstrutor();
  if (!Construtor) return;
  if (!contexto) contexto = new Construtor();
  if (contexto.state === 'suspended') void contexto.resume().catch(() => undefined);
}

/** Toca três bipes curtos. Retorna false se o navegador ainda bloquear o áudio. */
export function tocarAlerta(): boolean {
  const Construtor = obterConstrutor();
  if (!Construtor) return false;
  try {
    if (!contexto) contexto = new Construtor();
    if (contexto.state === 'suspended') void contexto.resume().catch(() => undefined);
    const ctx = contexto;
    const inicio = ctx.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const t = inicio + i * 0.35;
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 2 ? 1046.5 : 880, t);
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }
    return ctx.state === 'running';
  } catch {
    return false;
  }
}
