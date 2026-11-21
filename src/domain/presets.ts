import type { DadosPreset, Preset, ResultadoValidacao } from './tipos';

/** Limites das validações VR-01 a VR-05. */
export const LIMITES_PRESET = {
  nome: { min: 1, max: 40 },
  tempoFocoMin: { min: 1, max: 120 },
  tempoPausaCurtaMin: { min: 1, max: 60 },
  ciclosAntesPausaLonga: { min: 1, max: 12 },
  tempoPausaLongaMin: { min: 1, max: 60 },
} as const;

/** Valores do formulário de preset, sempre como texto (vindos dos inputs). */
export type FormularioPreset = Record<keyof DadosPreset, string>;

export const FORMULARIO_PRESET_PADRAO: FormularioPreset = {
  nome: '',
  tempoFocoMin: '25',
  tempoPausaCurtaMin: '5',
  ciclosAntesPausaLonga: '4',
  tempoPausaLongaMin: '15',
};

export function presetParaFormulario(p: DadosPreset): FormularioPreset {
  return {
    nome: p.nome,
    tempoFocoMin: String(p.tempoFocoMin),
    tempoPausaCurtaMin: String(p.tempoPausaCurtaMin),
    ciclosAntesPausaLonga: String(p.ciclosAntesPausaLonga),
    tempoPausaLongaMin: String(p.tempoPausaLongaMin),
  };
}

function validarInteiro(
  texto: string,
  { min, max }: { min: number; max: number },
  unidade: string,
): { valor: number } | { erro: string } {
  const t = texto.trim();
  if (t === '') return { erro: 'Campo obrigatório.' };
  if (!/^-?\d+$/.test(t)) return { erro: 'Informe um número inteiro.' };
  const valor = Number(t);
  if (valor < min || valor > max) return { erro: `Informe um valor entre ${min} e ${max} ${unidade}.` };
  return { valor };
}

/** Valida e converte os dados do formulário de preset (VR-01 a VR-05). */
export function validarPreset(form: FormularioPreset): ResultadoValidacao<DadosPreset> {
  const erros: Partial<Record<keyof DadosPreset, string>> = {};

  const nome = form.nome.trim();
  if (nome.length < LIMITES_PRESET.nome.min) erros.nome = 'O nome é obrigatório.';
  else if (nome.length > LIMITES_PRESET.nome.max)
    erros.nome = `O nome deve ter no máximo ${LIMITES_PRESET.nome.max} caracteres.`;

  const campos = [
    ['tempoFocoMin', 'minutos'],
    ['tempoPausaCurtaMin', 'minutos'],
    ['ciclosAntesPausaLonga', 'ciclos'],
    ['tempoPausaLongaMin', 'minutos'],
  ] as const;

  const numeros: Partial<Record<(typeof campos)[number][0], number>> = {};
  for (const [campo, unidade] of campos) {
    const r = validarInteiro(form[campo], LIMITES_PRESET[campo], unidade);
    if ('erro' in r) erros[campo] = r.erro;
    else numeros[campo] = r.valor;
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return {
    ok: true,
    valores: {
      nome,
      tempoFocoMin: numeros.tempoFocoMin!,
      tempoPausaCurtaMin: numeros.tempoPausaCurtaMin!,
      ciclosAntesPausaLonga: numeros.ciclosAntesPausaLonga!,
      tempoPausaLongaMin: numeros.tempoPausaLongaMin!,
    },
  };
}

export function criarPreset(dados: DadosPreset, id: string, agora: number): Preset {
  return { id, ...dados, criadoEm: agora, atualizadoEm: agora };
}

export function atualizarPreset(preset: Preset, dados: DadosPreset, agora: number): Preset {
  return { ...preset, ...dados, atualizadoEm: agora };
}

/** Verifica se um valor lido do armazenamento tem o formato de um preset válido. */
export function ehPresetValido(v: unknown): v is Preset {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  if (typeof p.id !== 'string' || typeof p.nome !== 'string') return false;
  if (typeof p.criadoEm !== 'number' || typeof p.atualizadoEm !== 'number') return false;
  const r = validarPreset({
    nome: p.nome,
    tempoFocoMin: String(p.tempoFocoMin),
    tempoPausaCurtaMin: String(p.tempoPausaCurtaMin),
    ciclosAntesPausaLonga: String(p.ciclosAntesPausaLonga),
    tempoPausaLongaMin: String(p.tempoPausaLongaMin),
  });
  return r.ok;
}

/** Presets oferecidos no primeiro acesso, para o usuário já poder começar. */
export function presetsIniciais(agora: number, gerarId: () => string): Preset[] {
  return [
    criarPreset(
      { nome: 'Pomodoro clássico', tempoFocoMin: 25, tempoPausaCurtaMin: 5, ciclosAntesPausaLonga: 4, tempoPausaLongaMin: 15 },
      gerarId(),
      agora,
    ),
    criarPreset(
      { nome: 'Estudo longo', tempoFocoMin: 50, tempoPausaCurtaMin: 10, ciclosAntesPausaLonga: 3, tempoPausaLongaMin: 30 },
      gerarId(),
      agora,
    ),
  ];
}
