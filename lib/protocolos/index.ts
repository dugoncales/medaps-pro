export interface PassoFluxo {
  numero: number
  titulo: string
  descricao: string
}

export interface RetornoDias {
  controlado: number
  parcial: number
  descontrolado: number
}

export interface Protocolo {
  codigo: string
  nome: string
  cor: string
  icone: string
  criterios_controle: string[]
  retorno_dias: RetornoDias
  escalas: string[]
  exames_obrigatorios: string[]
  passos_fluxo: PassoFluxo[]
}

export type StatusControle = 'controlado' | 'parcial' | 'descontrolado'

// ============================================================
// PROTOCOLOS
// ============================================================
export const PROTOCOLOS: Protocolo[] = [
  {
    codigo: 'HAS',
    nome: 'Hipertensão Arterial Sistêmica',
    cor: '#C0392B',
    icone: '❤️',
    criterios_controle: ['PA < 130/80 mmHg em pelo menos 2 aferições consecutivas'],
    retorno_dias: { controlado: 90, parcial: 45, descontrolado: 30 },
    escalas: [],
    exames_obrigatorios: [
      'Creatinina + TFG (anual)',
      'Microalbuminúria (anual)',
      'ECG (anual)',
      'PREVENT cardiovascular (bianual)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Triagem', descricao: 'Aferir PA em 2 momentos distintos, FC, peso e circunferência abdominal' },
      { numero: 2, titulo: 'Diagnóstico', descricao: 'Classificar grau da HAS e aplicar escore PREVENT' },
      { numero: 3, titulo: 'Tratamento', descricao: 'Iniciar MEV + farmacoterapia; IECA ou BRA como 1ª linha' },
      { numero: 4, titulo: 'LOA', descricao: 'Rastrear lesão de órgão-alvo: ECG, microalbuminúria' },
      { numero: 5, titulo: 'Meta PA < 130/80', descricao: 'Confirmar controle em consultas consecutivas' },
    ],
  },
  {
    codigo: 'DM',
    nome: 'Diabetes Mellitus',
    cor: '#D97706',
    icone: '🩸',
    criterios_controle: ['HbA1c < 7%'],
    retorno_dias: { controlado: 90, parcial: 60, descontrolado: 30 },
    escalas: [],
    exames_obrigatorios: [
      'HbA1c (a cada 3–6 meses)',
      'Exame do pé diabético (anual)',
      'TFG (anual)',
      'Fundoscopia (anual)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico', descricao: 'Confirmar DM por glicemia de jejum, TOTG ou HbA1c' },
      { numero: 2, titulo: 'Complicações', descricao: 'Rastrear pé diabético, retinopatia e nefropatia' },
      { numero: 3, titulo: 'Tratamento', descricao: 'MEV + Metformina → escalonar para iSGLT2 ou aGLP-1 conforme risco CV/renal' },
      { numero: 4, titulo: 'Metas', descricao: 'Monitorar HbA1c, PA, LDL e função renal' },
      { numero: 5, titulo: 'Manutenção', descricao: 'Revisão anual de complicações e ajuste de metas individualizadas' },
    ],
  },
  {
    codigo: 'OBE',
    nome: 'Obesidade',
    cor: '#7C3AED',
    icone: '⚖️',
    criterios_controle: ['Perda de peso ≥ 5% do peso inicial'],
    retorno_dias: { controlado: 90, parcial: 60, descontrolado: 30 },
    escalas: [],
    exames_obrigatorios: [],
    passos_fluxo: [
      { numero: 1, titulo: 'Avaliação', descricao: 'Calcular IMC e medir circunferência abdominal; classificar grau de obesidade' },
      { numero: 2, titulo: 'MEV', descricao: 'Prescrever mudança de estilo de vida: dieta hipocalórica + atividade física ≥ 150 min/semana' },
      { numero: 3, titulo: 'Farmacoterapia', descricao: 'Considerar aGLP-1 (semaglutida, liraglutida) em IMC ≥ 30 ou ≥ 27 com comorbidade' },
      { numero: 4, titulo: 'Cirurgia bariátrica', descricao: 'Avaliar elegibilidade: IMC ≥ 40 ou ≥ 35 com comorbidade grave' },
      { numero: 5, titulo: 'Manutenção', descricao: 'Manter perda de peso, monitorar reganho e ajustar estratégia' },
    ],
  },
  {
    codigo: 'DIS',
    nome: 'Dislipidemia',
    cor: '#0D7F4F',
    icone: '🫀',
    criterios_controle: ['LDL < 70 mg/dL (alto risco) ou < 100 mg/dL (risco intermediário)'],
    retorno_dias: { controlado: 180, parcial: 90, descontrolado: 45 },
    escalas: [],
    exames_obrigatorios: [
      'Lipidograma completo (a cada 6 meses)',
      'Lp(a) — uma vez na vida',
      'ALT (a cada 6 meses)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico + PREVENT', descricao: 'Avaliar lipidograma e calcular risco cardiovascular pelo PREVENT' },
      { numero: 2, titulo: 'MEV', descricao: 'Dieta pobre em gordura saturada, exercício aeróbico, cessação tabágica' },
      { numero: 3, titulo: 'Estatina', descricao: 'Iniciar estatina de alta intensidade conforme risco CV' },
      { numero: 4, titulo: 'Ezetimiba + iPCSK9', descricao: 'Adicionar ezetimiba se meta não atingida; iPCSK9 em alto risco refratário' },
      { numero: 5, titulo: 'Meta', descricao: 'Confirmar atingimento de LDL alvo e suspender monitoramento intensivo' },
    ],
  },
  {
    codigo: 'SM',
    nome: 'Saúde Mental — Depressão',
    cor: '#6B21A8',
    icone: '🧠',
    criterios_controle: ['PHQ-9 < 5'],
    retorno_dias: { controlado: 60, parcial: 30, descontrolado: 14 },
    escalas: ['PHQ-9 (mensal)', 'GAD-7 (mensal)'],
    exames_obrigatorios: [],
    passos_fluxo: [
      { numero: 1, titulo: 'Triagem', descricao: 'Aplicar PHQ-2; se ≥ 3, avançar para PHQ-9 completo' },
      { numero: 2, titulo: 'Diagnóstico', descricao: 'Classificar gravidade pelo PHQ-9 (leve 5–9; moderada 10–14; grave ≥ 15)' },
      { numero: 3, titulo: 'ISRS + TCC', descricao: 'Iniciar ISRS (sertralina ou escitalopram) + encaminhar para TCC' },
      { numero: 4, titulo: 'Monitoramento', descricao: 'Reaplicar PHQ-9 mensalmente; avaliar resposta e aderência' },
      { numero: 5, titulo: 'Remissão', descricao: 'PHQ-9 < 5 por ≥ 6 meses; manter farmacoterapia por ao menos 1 ano' },
    ],
  },
  {
    codigo: 'CHK',
    nome: 'Check-up Preventivo',
    cor: '#1A56A0',
    icone: '🔍',
    criterios_controle: ['Todos os rastreamentos indicados realizados e em dia'],
    retorno_dias: { controlado: 365, parcial: 180, descontrolado: 90 },
    escalas: ['PHQ-2 (anual)', 'AUDIT-C (anual)'],
    exames_obrigatorios: [
      'DNA-HPV (mulheres 25–64 anos, a cada 3 anos)',
      'Mamografia (mulheres ≥ 40 anos, a cada 2 anos)',
      'FIT — pesquisa de sangue oculto (≥ 45 anos, anual)',
      'PREVENT cardiovascular (bianual)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Triagem inicial', descricao: 'Coletar histórico, fatores de risco e rastreamentos já realizados' },
      { numero: 2, titulo: 'Rastreamento oncológico', descricao: 'Solicitar DNA-HPV, mamografia e FIT conforme faixa etária e sexo' },
      { numero: 3, titulo: 'Rastreamento cardiovascular', descricao: 'Calcular PREVENT; rastrear HAS, DM e dislipidemia' },
      { numero: 4, titulo: 'Imunização', descricao: 'Verificar cartão: Influenza anual, dTpa, COVID-19 atualizado, PCV20' },
      { numero: 5, titulo: 'Orientações e agendamento', descricao: 'Registrar próximos rastreamentos e orientar sobre hábitos saudáveis' },
    ],
  },
  {
    codigo: 'TAB',
    nome: 'Tabagismo',
    cor: '#B91C1C',
    icone: '🚭',
    criterios_controle: ['Cessação tabágica ≥ 6 meses confirmada'],
    retorno_dias: { controlado: 180, parcial: 30, descontrolado: 14 },
    escalas: ['Fagerström (a cada 3 meses)'],
    exames_obrigatorios: [],
    passos_fluxo: [
      { numero: 1, titulo: 'Ask', descricao: 'Perguntar status tabágico, carga tabágica (maços-ano) e histórico de tentativas' },
      { numero: 2, titulo: 'Assess + Advise', descricao: 'Avaliar dependência pelo Fagerström; aconselhar cessação com clareza' },
      { numero: 3, titulo: 'Assist', descricao: 'Definir Data D de cessação; prescrever TRN + Bupropiona (ou vareniclina)' },
      { numero: 4, titulo: 'Arrange', descricao: 'Agendar seguimento em 1–2 semanas após Data D; vincular ao grupo de apoio' },
      { numero: 5, titulo: 'Cessação confirmada', descricao: 'Confirmar abstinência ≥ 6 meses; monitorar por 1 ano para prevenção de recaída' },
    ],
  },
  {
    codigo: 'HIP',
    nome: 'Hipotireoidismo',
    cor: '#1B5E20',
    icone: '🦋',
    criterios_controle: ['TSH entre 0,5 e 2,5 mUI/L em dose estável'],
    retorno_dias: { controlado: 365, parcial: 90, descontrolado: 45 },
    escalas: [],
    exames_obrigatorios: [
      'TSH (a cada 6–8 semanas após ajuste de dose; anual em dose estável)',
      'Anti-TPO (uma vez ao diagnóstico)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico', descricao: 'Solicitar TSH + T4 livre; confirmar hipotireoidismo primário' },
      { numero: 2, titulo: 'Decisão de tratar subclínico', descricao: 'Tratar sempre se TSH > 10; tratar se TSH 4–10 + Anti-TPO positivo ou sintomas' },
      { numero: 3, titulo: 'Levotiroxina', descricao: 'Iniciar 1,6–1,8 mcg/kg/dia em jejum 30–60 min antes do café' },
      { numero: 4, titulo: 'Monitorização', descricao: 'Dosar apenas TSH após 6–8 semanas de cada ajuste' },
      { numero: 5, titulo: 'Estável anual', descricao: 'Confirmar TSH na meta; revisão anual de dose e aderência' },
    ],
  },
  {
    codigo: 'DPC',
    nome: 'DPOC',
    cor: '#01579B',
    icone: '🫁',
    criterios_controle: ['Sem exacerbações (critérios GOLD 2026)'],
    retorno_dias: { controlado: 90, parcial: 60, descontrolado: 30 },
    escalas: ['CAT (a cada 3 meses)', 'mMRC (a cada 3 meses)'],
    exames_obrigatorios: [
      'Espirometria (anual)',
      'Eosinófilos séricos (anual)',
      'Oximetria de pulso (a cada 3 meses)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico', descricao: 'Espirometria pós-broncodilatador: VEF1/CVF < 0,70 confirma obstrução' },
      { numero: 2, titulo: 'Classificação GOLD-ABE', descricao: 'Classificar por grau de obstrução (GOLD 1–4) e grupo ABE (sintomas + exacerbações)' },
      { numero: 3, titulo: 'Tratamento farmacológico', descricao: 'LABA + LAMA para grupos B/E; adicionar ICS se eosinófilos ≥ 300 células/µL' },
      { numero: 4, titulo: 'Não farmacológico', descricao: 'Cessação tabágica (prioridade máxima), vacinas, reabilitação pulmonar' },
      { numero: 5, titulo: 'Baixa atividade de doença', descricao: 'Manter controle com revisão semestral de técnica inalatória e adesão' },
    ],
  },
  {
    codigo: 'SME',
    nome: 'Síndrome Metabólica',
    cor: '#4A148C',
    icone: '🔮',
    criterios_controle: ['≤ 2 critérios da síndrome metabólica presentes'],
    retorno_dias: { controlado: 180, parcial: 90, descontrolado: 60 },
    escalas: [],
    exames_obrigatorios: [
      'CA + PA + peso (a cada 3 meses)',
      'Glicemia + triglicerídeos (a cada 6 meses)',
      'PREVENT cardiovascular (bianual)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico', descricao: '3 de 5 critérios: CA > 90/80 cm, GJ > 100 mg/dL, PA > 130/85, TG > 150, HDL < 40/50 mg/dL' },
      { numero: 2, titulo: 'MEV', descricao: 'Perda de peso 5–10%, dieta mediterrânea, exercício aeróbico 150 min/semana' },
      { numero: 3, titulo: 'Tratamento por componente', descricao: 'IECA/BRA para PA, Metformina/aGLP-1 para glicemia/peso, fibratos para TG alto' },
      { numero: 4, titulo: 'PREVENT', descricao: 'Calcular risco cardiovascular e ajustar intensidade do tratamento' },
      { numero: 5, titulo: 'Controle semestral', descricao: 'Reclassificar critérios presentes; ajustar metas a cada semestre' },
    ],
  },
  {
    codigo: 'TAG',
    nome: 'Transtorno de Ansiedade Generalizada',
    cor: '#1A237E',
    icone: '😰',
    criterios_controle: ['GAD-7 < 5'],
    retorno_dias: { controlado: 60, parcial: 30, descontrolado: 14 },
    escalas: ['GAD-7 (mensal)'],
    exames_obrigatorios: [
      'TSH (anual)',
      'ECG (anual)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Triagem', descricao: 'Aplicar GAD-2; se ≥ 3, avançar para GAD-7 completo' },
      { numero: 2, titulo: 'Diagnóstico DSM-5-TR', descricao: 'Confirmar ansiedade generalizada por ≥ 6 meses com comprometimento funcional' },
      { numero: 3, titulo: 'TCC + ISRS', descricao: 'Encaminhar para TCC; iniciar escitalopram ou sertralina' },
      { numero: 4, titulo: 'Monitoramento', descricao: 'Reaplicar GAD-7 mensalmente; avaliar resposta em 4–6 semanas' },
      { numero: 5, titulo: 'Remissão', descricao: 'GAD-7 < 5 por ≥ 6 meses; manter farmacoterapia por ao menos 1 ano' },
    ],
  },
  {
    codigo: 'CEF',
    nome: 'Cefaleia',
    cor: '#4E342E',
    icone: '💆',
    criterios_controle: ['Redução ≥ 50% na frequência de crises em relação ao basal'],
    retorno_dias: { controlado: 90, parcial: 45, descontrolado: 30 },
    escalas: ['EVA (diário, pelo paciente)'],
    exames_obrigatorios: [],
    passos_fluxo: [
      { numero: 1, titulo: 'Classificação + red flags', descricao: 'Classificar pela ICHD-3; afastar red flags (cefaleia em trovão, febre, déficit focal)' },
      { numero: 2, titulo: 'Tratamento agudo', descricao: 'Triptanos para enxaqueca moderada–grave; AINEs para crise leve' },
      { numero: 3, titulo: 'Profilaxia', descricao: 'Indicar profilaxia se ≥ 4 crises/mês: propranolol, amitriptilina ou topiramato' },
      { numero: 4, titulo: 'Diário + monitoramento', descricao: 'Orientar preenchimento de diário de cefaleia; identificar gatilhos' },
      { numero: 5, titulo: 'Controle ≥ 50%', descricao: 'Confirmar redução de ≥ 50% das crises por 3 meses consecutivos' },
    ],
  },
  {
    codigo: 'GOT',
    nome: 'Gota',
    cor: '#004D40',
    icone: '💎',
    criterios_controle: ['Ácido úrico sérico < 6,0 mg/dL em dose estável'],
    retorno_dias: { controlado: 180, parcial: 60, descontrolado: 30 },
    escalas: [],
    exames_obrigatorios: [
      'Ácido úrico sérico (a cada 2 meses em ajuste; a cada 6 meses em meta)',
      'TFG (anual)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico', descricao: 'Confirmar crise gotosa clínica ou por cristais; dosar ácido úrico' },
      { numero: 2, titulo: 'Crise aguda', descricao: 'Colchicina 0,5 mg a cada 8 h como 1ª linha; AINEs ou corticoide como alternativa' },
      { numero: 3, titulo: 'Indicação de alopurinol', descricao: 'Indicar se ≥ 2 crises/ano, tofos ou DRC associada' },
      { numero: 4, titulo: 'Titulação', descricao: 'Iniciar alopurinol 100 mg e aumentar 100 mg a cada 2–4 semanas até atingir meta' },
      { numero: 5, titulo: 'Meta AU < 6,0', descricao: 'Confirmar ácido úrico < 6,0 mg/dL em duas dosagens consecutivas' },
    ],
  },
  {
    codigo: 'ALC',
    nome: 'Álcool e Substâncias',
    cor: '#4527A0',
    icone: '🍺',
    criterios_controle: ['AUDIT < 8 ou abstinência confirmada ≥ 6 meses'],
    retorno_dias: { controlado: 90, parcial: 30, descontrolado: 7 },
    escalas: ['AUDIT-C (a cada 3 meses)', 'AUDIT (a cada 3 meses)'],
    exames_obrigatorios: [],
    passos_fluxo: [
      { numero: 1, titulo: 'Triagem AUDIT-C', descricao: 'Aplicar AUDIT-C; se positivo (≥ 3 F / ≥ 4 M), avançar para AUDIT completo' },
      { numero: 2, titulo: 'Diagnóstico TUA DSM-5-TR', descricao: 'Transtorno por uso de álcool: ≥ 2 de 11 critérios DSM-5-TR no último ano' },
      { numero: 3, titulo: 'IB + Farmacoterapia', descricao: 'Intervenção breve; prescrever Tiamina SEMPRE; naltrexona 50 mg ou acamprosato' },
      { numero: 4, titulo: 'Jogo Patológico', descricao: 'Rastrear TJP (CID-11 QD50) concomitante; encaminhar para TCC especializada' },
      { numero: 5, titulo: 'Remissão', descricao: 'Confirmar abstinência ou padrão de baixo risco (AUDIT < 8) por ≥ 6 meses' },
    ],
  },
  {
    codigo: 'ASM',
    nome: 'Asma',
    cor: '#1565C0',
    icone: '💨',
    criterios_controle: ['Asma bem controlada pelos critérios GINA'],
    retorno_dias: { controlado: 180, parcial: 90, descontrolado: 30 },
    escalas: [],
    exames_obrigatorios: [
      'Espirometria (anual)',
      'Pico de fluxo expiratório — PFE (a cada 3 meses)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico', descricao: 'Espirometria pós-broncodilatador: VEF1 ↑ ≥ 12% + 200 mL confirma reversibilidade' },
      { numero: 2, titulo: 'Controle GINA', descricao: 'Classificar como bem controlada, parcialmente controlada ou não controlada' },
      { numero: 3, titulo: 'Escalonamento GINA 2025', descricao: 'ICS-formoterol como medicação de alívio em TODOS os degraus (anti-inflamatório de resgate)' },
      { numero: 4, titulo: 'Técnica inalatória + plano de ação', descricao: 'Checar técnica a cada consulta; fornecer plano de ação escrito' },
      { numero: 5, titulo: 'Bem controlada', descricao: 'Confirmar controle por ≥ 3 meses; considerar desescalonamento cuidadoso' },
    ],
  },
  {
    codigo: 'SAO',
    nome: 'Síndrome da Apneia Obstrutiva do Sono',
    cor: '#37474F',
    icone: '😴',
    criterios_controle: ['Uso de CPAP ≥ 4 h/noite em ≥ 70% das noites'],
    retorno_dias: { controlado: 180, parcial: 90, descontrolado: 30 },
    escalas: ['STOP-BANG (anual)', 'Epworth (a cada 3 meses)'],
    exames_obrigatorios: [
      'Polissonografia — PSG (uma vez ao diagnóstico)',
      'Cartão de memória do CPAP (a cada 3 meses)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Triagem STOP-BANG', descricao: 'Aplicar STOP-BANG; ≥ 3 pontos = alto risco; encaminhar para PSG' },
      { numero: 2, titulo: 'PSG', descricao: 'Confirmar SAOS pelo IAH: leve 5–14, moderada 15–29, grave ≥ 30 eventos/h' },
      { numero: 3, titulo: 'Tratamento', descricao: 'CPAP como padrão-ouro; MEV com foco em perda de peso ≥ 10%' },
      { numero: 4, titulo: 'Monitoramento do CPAP', descricao: 'Analisar cartão de memória: AHI residual, pressão, fugas e horas de uso' },
      { numero: 5, titulo: 'Adesão ≥ 4 h/noite', descricao: 'Confirmar adesão sustentada; abordar barreiras e ajustar máscara se necessário' },
    ],
  },
  {
    codigo: 'DRM',
    nome: 'Dermatose Ocupacional',
    cor: '#BF360C',
    icone: '🖐️',
    criterios_controle: ['Lesões curadas e uso correto de EPI confirmado'],
    retorno_dias: { controlado: 90, parcial: 30, descontrolado: 14 },
    escalas: [],
    exames_obrigatorios: [],
    passos_fluxo: [
      { numero: 1, titulo: 'Diagnóstico', descricao: 'Diferenciar Dermatite de Contato Irritativa (DCI) de Alérgica (DCA); patch test se necessário' },
      { numero: 2, titulo: 'Notificação SINAN', descricao: 'Notificar obrigatoriamente no SINAN como doença ocupacional' },
      { numero: 3, titulo: 'Tratamento', descricao: 'Corticoide tópico de potência conforme localização + emoliente diário' },
      { numero: 4, titulo: 'Afastamento + EPI', descricao: 'Afastar da exposição; exigir luvas de nitrila e barreiras cutâneas no retorno' },
      { numero: 5, titulo: 'Cura / Readaptação', descricao: 'Confirmar resolução clínica; readaptar função se sensibilização permanente' },
    ],
  },
  {
    codigo: 'HOM',
    nome: 'Saúde do Homem',
    cor: '#1565C0',
    icone: '👨',
    criterios_controle: ['Todos os rastreamentos indicados por faixa etária realizados e em dia'],
    retorno_dias: { controlado: 365, parcial: 180, descontrolado: 90 },
    escalas: [
      'PHQ-9 (anual)',
      'AUDIT-C (anual)',
      'IIEF-5 (anual)',
      'STOP-BANG (anual)',
    ],
    exames_obrigatorios: [
      'PA + IMC + CA (anual)',
      'Glicemia + lipídios (anual)',
      'HIV (uma vez na vida ou conforme risco)',
      'PSA (decisão compartilhada, 55–69 anos)',
      'Testosterona total (se sintomático)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Acolhimento ativo', descricao: 'Romper barreira de acesso; criar vínculo e explicar a importância do cuidado preventivo' },
      { numero: 2, titulo: 'Rastreamento por faixa etária', descricao: 'Aplicar protocolos preventivos conforme idade: CV, oncológico, metabólico' },
      { numero: 3, titulo: 'Saúde sexual', descricao: 'Aplicar IIEF-5; abordar disfunção erétil; prescrever sildenafila se indicado' },
      { numero: 4, titulo: 'Saúde mental', descricao: 'Aplicar PHQ-9; rastrear depressão mascarada por irritabilidade ou abuso de álcool' },
      { numero: 5, titulo: 'Rastreamentos em dia', descricao: 'Confirmar que todos os rastreamentos indicados foram realizados e agendados' },
    ],
  },
  {
    codigo: 'MUL',
    nome: 'Saúde da Mulher',
    cor: '#880E4F',
    icone: '👩',
    criterios_controle: ['Todos os rastreamentos indicados por faixa etária realizados e em dia'],
    retorno_dias: { controlado: 365, parcial: 180, descontrolado: 90 },
    escalas: ['PHQ-9 (a cada 6 meses)'],
    exames_obrigatorios: [
      'DNA-HPV (mulheres 25–64 anos, a cada 5 anos se negativo — MS 2025)',
      'Mamografia (≥ 40 anos, a cada 2 anos)',
      'FIT (≥ 45 anos, anual)',
      'DEXA (≥ 65 anos)',
      'HIV (uma vez na vida ou conforme risco)',
    ],
    passos_fluxo: [
      { numero: 1, titulo: 'Rastreamento oncológico', descricao: 'DNA-HPV conforme protocolo MS 2025; mamografia a partir dos 40 anos' },
      { numero: 2, titulo: 'Contracepção', descricao: 'Discutir escolha contraceptiva compartilhada; recomendar dupla proteção' },
      { numero: 3, titulo: 'Climatério + THM', descricao: 'Abordar sintomas do climatério; janela de oportunidade < 60 anos; via transdérmica preferencial' },
      { numero: 4, titulo: 'Violência doméstica', descricao: 'Rastreio universal; notificação obrigatória no SINAN se identificada violência' },
      { numero: 5, titulo: 'Rastreamentos em dia', descricao: 'Confirmar que todos os rastreamentos indicados foram realizados e agendados' },
    ],
  },
  {
    codigo: 'LOM',
    nome: 'Lombalgia',
    cor: '#4E342E',
    icone: '🦴',
    criterios_controle: ['EVA ≤ 3 e retorno às atividades habituais'],
    retorno_dias: { controlado: 90, parcial: 30, descontrolado: 14 },
    escalas: ['EVA (diário, pelo paciente)'],
    exames_obrigatorios: [],
    passos_fluxo: [
      { numero: 1, titulo: 'Avaliação + red flags', descricao: 'Pesquisar red flags: síndrome da cauda equina, febre, perda de peso, trauma — são emergência' },
      { numero: 2, titulo: 'Imagem só se red flag', descricao: 'NÃO solicitar RX/TC/RM na 1ª consulta sem alerta; lombalgia aguda é clínica' },
      { numero: 3, titulo: 'Tratamento conservador', descricao: 'Manter ativo (evitar repouso absoluto), calor local, dipirona ou AINEs por ciclo curto' },
      { numero: 4, titulo: 'Yellow flags + crônico', descricao: 'Identificar fatores psicossociais; encaminhar TCC; prescrever exercício de fortalecimento de core' },
      { numero: 5, titulo: 'Resolução', descricao: 'Confirmar EVA ≤ 3 e retorno às atividades; alta com orientação de recorrência' },
    ],
  },
]

export const PROTOCOLO_MAP = new Map<string, Protocolo>(
  PROTOCOLOS.map(p => [p.codigo, p])
)

// ============================================================
// calcularStatusControle
// ============================================================

interface MetricasHAS { pa_sistolica?: number; pa_diastolica?: number }
interface MetricasDM { hba1c?: number }
interface MetricasOBE { perda_pct?: number }
interface MetricasDIS { ldl?: number; risco_cv?: 'alto' | 'intermediario' | 'baixo' }
interface MetricasSM { phq9?: number }
interface MetricasGeral { [key: string]: number | string | undefined }

type MetricasProtocolo =
  | MetricasHAS
  | MetricasDM
  | MetricasOBE
  | MetricasDIS
  | MetricasSM
  | MetricasGeral

export function calcularStatusControle(
  protocolo: Protocolo | string,
  metricas: MetricasProtocolo
): StatusControle {
  const codigo = typeof protocolo === 'string' ? protocolo : protocolo.codigo
  const m = metricas as MetricasGeral

  switch (codigo) {
    case 'HAS': {
      const sis = m.pa_sistolica as number | undefined
      const dia = m.pa_diastolica as number | undefined
      if (sis === undefined || dia === undefined) return 'descontrolado'
      if (sis < 130 && dia < 80) return 'controlado'
      if (sis < 140 && dia < 90) return 'parcial'
      return 'descontrolado'
    }

    case 'DM': {
      const hba1c = m.hba1c as number | undefined
      if (hba1c === undefined) return 'descontrolado'
      if (hba1c < 7) return 'controlado'
      if (hba1c < 8) return 'parcial'
      return 'descontrolado'
    }

    case 'OBE': {
      const perda = m.perda_pct as number | undefined
      if (perda === undefined) return 'descontrolado'
      if (perda >= 10) return 'controlado'
      if (perda >= 5) return 'parcial'
      return 'descontrolado'
    }

    case 'DIS': {
      const ldl = m.ldl as number | undefined
      const risco = (m.risco_cv as string | undefined) ?? 'alto'
      if (ldl === undefined) return 'descontrolado'
      const meta = risco === 'alto' ? 70 : 100
      if (ldl < meta) return 'controlado'
      if (ldl < meta + 30) return 'parcial'
      return 'descontrolado'
    }

    case 'SM': {
      const phq9 = m.phq9 as number | undefined
      if (phq9 === undefined) return 'descontrolado'
      if (phq9 < 5) return 'controlado'
      if (phq9 < 10) return 'parcial'
      return 'descontrolado'
    }

    case 'CHK':
    case 'HOM':
    case 'MUL': {
      const rastreamentos_em_dia = m.rastreamentos_em_dia as number | undefined
      const total_rastreamentos = m.total_rastreamentos as number | undefined
      if (rastreamentos_em_dia === undefined || total_rastreamentos === undefined) return 'descontrolado'
      if (total_rastreamentos === 0) return 'controlado'
      const pct = rastreamentos_em_dia / total_rastreamentos
      if (pct >= 1) return 'controlado'
      if (pct >= 0.75) return 'parcial'
      return 'descontrolado'
    }

    case 'TAB': {
      const meses_cessacao = m.meses_cessacao as number | undefined
      if (meses_cessacao === undefined) return 'descontrolado'
      if (meses_cessacao >= 6) return 'controlado'
      if (meses_cessacao >= 1) return 'parcial'
      return 'descontrolado'
    }

    case 'HIP': {
      const tsh = m.tsh as number | undefined
      if (tsh === undefined) return 'descontrolado'
      if (tsh >= 0.5 && tsh <= 2.5) return 'controlado'
      if (tsh >= 0.4 && tsh <= 4.0) return 'parcial'
      return 'descontrolado'
    }

    case 'DPC': {
      const exacerbacoes_12m = m.exacerbacoes_12m as number | undefined
      const cat = m.cat as number | undefined
      if (exacerbacoes_12m === undefined) return 'descontrolado'
      if (exacerbacoes_12m === 0 && (cat === undefined || cat < 10)) return 'controlado'
      if (exacerbacoes_12m <= 1) return 'parcial'
      return 'descontrolado'
    }

    case 'SME': {
      const criterios_presentes = m.criterios_presentes as number | undefined
      if (criterios_presentes === undefined) return 'descontrolado'
      if (criterios_presentes <= 2) return 'controlado'
      if (criterios_presentes <= 3) return 'parcial'
      return 'descontrolado'
    }

    case 'TAG': {
      const gad7 = m.gad7 as number | undefined
      if (gad7 === undefined) return 'descontrolado'
      if (gad7 < 5) return 'controlado'
      if (gad7 < 10) return 'parcial'
      return 'descontrolado'
    }

    case 'CEF': {
      const reducao_crises_pct = m.reducao_crises_pct as number | undefined
      if (reducao_crises_pct === undefined) return 'descontrolado'
      if (reducao_crises_pct >= 50) return 'controlado'
      if (reducao_crises_pct >= 25) return 'parcial'
      return 'descontrolado'
    }

    case 'GOT': {
      const acido_urico = m.acido_urico as number | undefined
      if (acido_urico === undefined) return 'descontrolado'
      if (acido_urico < 6.0) return 'controlado'
      if (acido_urico < 7.0) return 'parcial'
      return 'descontrolado'
    }

    case 'ALC': {
      const audit = m.audit as number | undefined
      const meses_abstinencia = m.meses_abstinencia as number | undefined
      if (meses_abstinencia !== undefined && meses_abstinencia >= 6) return 'controlado'
      if (audit === undefined) return 'descontrolado'
      if (audit < 8) return 'controlado'
      if (audit < 16) return 'parcial'
      return 'descontrolado'
    }

    case 'ASM': {
      const gina_controlada = m.gina_controlada as boolean | number | undefined
      const crises_emergencia_3m = m.crises_emergencia_3m as number | undefined
      if (gina_controlada === undefined) return 'descontrolado'
      if (gina_controlada === true || gina_controlada === 1) return 'controlado'
      if (crises_emergencia_3m !== undefined && crises_emergencia_3m <= 1) return 'parcial'
      return 'descontrolado'
    }

    case 'SAO': {
      const horas_cpap = m.horas_cpap as number | undefined
      const noites_pct = m.noites_pct as number | undefined
      if (horas_cpap === undefined || noites_pct === undefined) return 'descontrolado'
      if (horas_cpap >= 4 && noites_pct >= 70) return 'controlado'
      if (horas_cpap >= 4 && noites_pct >= 50) return 'parcial'
      return 'descontrolado'
    }

    case 'DRM': {
      const lesoes_ativas = m.lesoes_ativas as number | undefined
      const epi_correto = m.epi_correto as boolean | number | undefined
      if (lesoes_ativas === undefined) return 'descontrolado'
      if (lesoes_ativas === 0 && (epi_correto === true || epi_correto === 1)) return 'controlado'
      if (lesoes_ativas <= 1) return 'parcial'
      return 'descontrolado'
    }

    case 'LOM': {
      const eva = m.eva as number | undefined
      if (eva === undefined) return 'descontrolado'
      if (eva <= 3) return 'controlado'
      if (eva <= 6) return 'parcial'
      return 'descontrolado'
    }

    default:
      return 'descontrolado'
  }
}

// ============================================================
// Tipos para gerarAlertasAutomaticos
// ============================================================

export interface PacienteResumo {
  id: string
  empresa_id: string
  nome: string
}

export interface LinhaResumo {
  protocolo_codigo: string
  status: 'ativo' | 'inativo' | 'alta'
  nivel_gravidade: StatusControle | null
}

export interface UltimaConsulta {
  protocolo_codigo: string
  data_consulta: string // ISO date string
  retorno_em_dias?: number | null
  data_proximo_retorno?: string | null
}

export interface UltimoExame {
  nome_exame: string
  data_coleta: string // ISO date string
}

export interface AlertaGerado {
  paciente_id: string
  empresa_id: string
  protocolo_codigo: string
  tipo: 'retorno_vencido' | 'exame_atrasado' | 'meta_nao_atingida' | 'urgencia'
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  titulo: string
  descricao: string
  data_vencimento: string // ISO date string
  dias_atraso: number
}

// Mapeia cada protocolo para seus exames e o intervalo esperado em dias
const EXAMES_ESPERADOS: Record<string, { nome: string; intervalo_dias: number }[]> = {
  HAS: [
    { nome: 'Creatinina', intervalo_dias: 365 },
    { nome: 'Microalbuminúria', intervalo_dias: 365 },
    { nome: 'ECG', intervalo_dias: 365 },
  ],
  DM: [
    { nome: 'HbA1c', intervalo_dias: 180 },
    { nome: 'Pé diabético', intervalo_dias: 365 },
    { nome: 'TFG', intervalo_dias: 365 },
    { nome: 'Fundoscopia', intervalo_dias: 365 },
  ],
  DIS: [
    { nome: 'Lipidograma', intervalo_dias: 180 },
    { nome: 'ALT', intervalo_dias: 180 },
  ],
  HIP: [
    { nome: 'TSH', intervalo_dias: 180 },
  ],
  DPC: [
    { nome: 'Espirometria', intervalo_dias: 365 },
    { nome: 'Eosinófilos', intervalo_dias: 365 },
  ],
  SME: [
    { nome: 'Glicemia', intervalo_dias: 180 },
    { nome: 'Triglicerídeos', intervalo_dias: 180 },
  ],
  TAG: [
    { nome: 'TSH', intervalo_dias: 365 },
  ],
  ASM: [
    { nome: 'Espirometria', intervalo_dias: 365 },
  ],
  SAO: [
    { nome: 'Cartão CPAP', intervalo_dias: 90 },
  ],
  CHK: [
    { nome: 'FIT', intervalo_dias: 365 },
    { nome: 'Mamografia', intervalo_dias: 730 },
    { nome: 'DNA-HPV', intervalo_dias: 1095 },
  ],
  HOM: [
    { nome: 'PA', intervalo_dias: 365 },
    { nome: 'Glicemia', intervalo_dias: 365 },
    { nome: 'Lipidograma', intervalo_dias: 365 },
  ],
  MUL: [
    { nome: 'DNA-HPV', intervalo_dias: 1825 },
    { nome: 'Mamografia', intervalo_dias: 730 },
    { nome: 'FIT', intervalo_dias: 365 },
  ],
  GOT: [
    { nome: 'Ácido úrico', intervalo_dias: 60 },
  ],
}

function diasAtraso(dataStr: string, hoje = new Date()): number {
  const data = new Date(dataStr)
  const diff = hoje.getTime() - data.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function prioridadePorAtraso(dias: number): AlertaGerado['prioridade'] {
  if (dias >= 60) return 'critica'
  if (dias >= 30) return 'alta'
  if (dias >= 14) return 'media'
  return 'baixa'
}

export function gerarAlertasAutomaticos(
  paciente: PacienteResumo,
  linhas: LinhaResumo[],
  ultimasConsultas: UltimaConsulta[],
  ultimosExames: UltimoExame[],
  hoje = new Date()
): AlertaGerado[] {
  const alertas: AlertaGerado[] = []
  const hojeStr = hoje.toISOString().split('T')[0]

  const linhasAtivas = linhas.filter(l => l.status === 'ativo')

  for (const linha of linhasAtivas) {
    const protocolo = PROTOCOLO_MAP.get(linha.protocolo_codigo)
    if (!protocolo) continue

    // --- Retorno vencido ---
    const ultimaConsulta = ultimasConsultas.find(c => c.protocolo_codigo === linha.protocolo_codigo)

    if (!ultimaConsulta) {
      // Nunca teve consulta nesta linha — alerta crítico
      alertas.push({
        paciente_id: paciente.id,
        empresa_id: paciente.empresa_id,
        protocolo_codigo: linha.protocolo_codigo,
        tipo: 'retorno_vencido',
        prioridade: 'alta',
        titulo: `${protocolo.nome} — 1ª consulta pendente`,
        descricao: `Paciente inscrito no protocolo ${protocolo.codigo} sem nenhuma consulta registrada.`,
        data_vencimento: hojeStr,
        dias_atraso: 0,
      })
    } else {
      // Calcular data prevista de retorno
      let dataProxima: Date | null = null

      if (ultimaConsulta.data_proximo_retorno) {
        dataProxima = new Date(ultimaConsulta.data_proximo_retorno)
      } else if (ultimaConsulta.retorno_em_dias) {
        dataProxima = new Date(ultimaConsulta.data_consulta)
        dataProxima.setDate(dataProxima.getDate() + ultimaConsulta.retorno_em_dias)
      } else {
        // Usar retorno padrão do protocolo conforme nível atual
        const nivel = linha.nivel_gravidade ?? 'descontrolado'
        const diasRetorno = protocolo.retorno_dias[nivel]
        dataProxima = new Date(ultimaConsulta.data_consulta)
        dataProxima.setDate(dataProxima.getDate() + diasRetorno)
      }

      const atraso = diasAtraso(dataProxima.toISOString().split('T')[0], hoje)

      if (atraso > 0) {
        alertas.push({
          paciente_id: paciente.id,
          empresa_id: paciente.empresa_id,
          protocolo_codigo: linha.protocolo_codigo,
          tipo: 'retorno_vencido',
          prioridade: prioridadePorAtraso(atraso),
          titulo: `${protocolo.nome} — retorno atrasado ${atraso}d`,
          descricao: `Último retorno previsto para ${dataProxima.toLocaleDateString('pt-BR')}. Paciente com ${atraso} dias de atraso.`,
          data_vencimento: dataProxima.toISOString().split('T')[0],
          dias_atraso: atraso,
        })
      }
    }

    // --- Exames atrasados ---
    const examesDoProtocolo = EXAMES_ESPERADOS[linha.protocolo_codigo] ?? []

    for (const exameEsperado of examesDoProtocolo) {
      const ultimoExame = ultimosExames
        .filter(e => e.nome_exame.toLowerCase().includes(exameEsperado.nome.toLowerCase()))
        .sort((a, b) => new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime())[0]

      if (!ultimoExame) {
        alertas.push({
          paciente_id: paciente.id,
          empresa_id: paciente.empresa_id,
          protocolo_codigo: linha.protocolo_codigo,
          tipo: 'exame_atrasado',
          prioridade: 'media',
          titulo: `${exameEsperado.nome} não encontrado`,
          descricao: `Exame "${exameEsperado.nome}" obrigatório no protocolo ${protocolo.codigo} nunca foi registrado.`,
          data_vencimento: hojeStr,
          dias_atraso: 0,
        })
        continue
      }

      const dataProximoExame = new Date(ultimoExame.data_coleta)
      dataProximoExame.setDate(dataProximoExame.getDate() + exameEsperado.intervalo_dias)

      const atraso = diasAtraso(dataProximoExame.toISOString().split('T')[0], hoje)

      if (atraso > 0) {
        alertas.push({
          paciente_id: paciente.id,
          empresa_id: paciente.empresa_id,
          protocolo_codigo: linha.protocolo_codigo,
          tipo: 'exame_atrasado',
          prioridade: prioridadePorAtraso(atraso),
          titulo: `${exameEsperado.nome} atrasado ${atraso}d`,
          descricao: `Último ${exameEsperado.nome} em ${new Date(ultimoExame.data_coleta).toLocaleDateString('pt-BR')}. Previsto a cada ${exameEsperado.intervalo_dias} dias.`,
          data_vencimento: dataProximoExame.toISOString().split('T')[0],
          dias_atraso: atraso,
        })
      }
    }
  }

  return alertas
}
