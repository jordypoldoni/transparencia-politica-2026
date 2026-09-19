// gerar_explicacao_votacoes.js — camada zero das votações (OFFLINE, EM LOTE).
//
// O PROBLEMA
// A ementa oficial é escrita para advogado: "Altera a Lei nº 9.503, de 23 de setembro de
// 1997". O leitor comum não sai sabendo o que muda na vida dele. Medido no banco em
// 13/09/2026: 771 votações, todas com ementa (média de 199 caracteres), mas `ementa_detalhada`
// só existe em 14 delas e com média de 71 caracteres. Não é camada, é sobra.
//
// POR QUE ISTO É OFFLINE E NÃO UM BOTÃO QUE CHAMA A IA NA HORA
// O botão "quero entender melhor" faz SEMPRE a mesma pergunta sobre a MESMA votação. Logo a
// resposta é sempre a mesma. Gerar na hora significaria pagar (em token e em segundos de
// espera) toda vez que alguém clica, para receber texto idêntico — e ainda exigiria chave de
// IA no servidor, trava de gasto e cache. Gerando aqui, uma vez: custo fixo, clique
// instantâneo, nenhuma chave exposta, e o texto entra no HTML servido, então o Google indexa.
// Conteúdo gerado no clique seria invisível para busca.
//
// AS DUAS CAMADAS (decisão do Jordy, 13/09/2026)
//   explicacao_cidada — uma frase, sempre visível, logo abaixo da ementa.
//   contexto_extra    — 3 a 4 frases, atrás do botão.
// A ementa oficial e o link para o documento CONTINUAM na tela. Isto é camada acrescentada,
// nunca substituição (regra do Jordy: não remover nada do que já existe).
//
// LIMITE EDITORIAL — inegociável, é o núcleo do projeto
// Só O QUE O TEXTO FAZ. "Aumenta de 30 para 60 dias o prazo para X" é fato, está no documento
// e qualquer um confere. "Vai melhorar a vida do trabalhador" é análise, e o Lume não opina.
// O prompt proíbe mérito, motivo, impacto, elogio, crítica e comparação entre partidos.
//
// O RISCO REAL DESTE SCRIPT: A IA SÓ ENXERGA A EMENTA.
// Ela não tem o inteiro teor. Se a ementa diz apenas "Altera a Lei nº 9.503/1997", não há como
// saber O QUE foi alterado, e um modelo prestativo INVENTA. Por isso o prompt manda dizer, com
// todas as letras, que a ementa não detalha — e a limpeza abaixo derruba resposta que cite
// número de artigo ou porcentagem que não apareça na entrada. Explicação errada é pior que
// explicação nenhuma: o leitor acredita nela.
//
// PROVEDOR (14/09/2026): PADRÃO É O GEMINI. A Groq continua disponível com --groq.
// Trocamos porque os gargalos são opostos e o do Gemini é folgado para este trabalho:
// Groq dá 8 mil tokens/minuto (o minuto trava, daí lotes de 6); Gemini dá 250 mil/minuto e
// limita REQUISIÇÃO POR DIA, então lotes de 12 gastam metade das requisições. Na prática:
// dois dias de Groq contra uma rodada de minutos no Gemini.
//
// USO:
//   node coletores/gerar_explicacao_votacoes.js          (faz o que falta, no Gemini)
//   node coletores/gerar_explicacao_votacoes.js --groq   (mesma coisa, pela Groq)
//   node coletores/gerar_explicacao_votacoes.js --force  (refaz todas)
//   node coletores/gerar_explicacao_votacoes.js --n=30   (só as 30 mais recentes, para testar)
//
// Precisa no .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROK_API_KEY (a chave é da Groq).
// Divide o orçamento diário com gerar_resumo_propostas.js: os dois leem e escrevem o mesmo
// _orcamento_resumos.json, então rodar um consome o dia do outro. É de propósito — o teto de
// 200 mil tokens/dia da Groq é por conta, não por script.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// O site já traduz resultado e tipo de votação por REGRA, sem IA. Reaproveitar é obrigatório:
// se o coletor inventasse a própria tradução, o texto do banco e o texto da tela divergiriam.
import { humanizarVotacao, explicarTipo } from '../src/lib/votacao.js';
import { casaDaVotacao } from '../src/lib/casa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO_ORCAMENTO = path.join(__dirname, '_orcamento_resumos.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Faltam credenciais Supabase (.env).'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FORCE = process.argv.includes('--force');
const LIMITE = parseInt((process.argv.find((a) => a.startsWith('--n=')) || '').slice(4), 10) || 0;
const USAR_GROQ = process.argv.includes('--groq');

// ---------- DOIS PROVEDORES, E ELES TÊM GARGALOS DIFERENTES ----------
// Medido em 14/09/2026 com coletores/_testar_gemini.mjs:
//
//   Groq free   → 8.000 tokens por MINUTO, 200 mil por dia. O minuto é o que trava: uma
//                 requisição perto do teto fica esperando janela livre. Por isso lotes de 6.
//   Gemini free → 250.000 tokens por minuto (31x a Groq). Token deixa de ser problema; o que
//                 limita é REQUISIÇÃO POR DIA. Então o certo aqui é o inverso: lotes GRANDES,
//                 para gastar menos requisições.
//
// ARMADILHA MEDIDA: a chave que desliga o "pensamento" MUDA CONFORME O MODELO.
//   gemini-3.6-flash → reasoning_effort 'none' devolve 400; 'low' zera o pensamento.
//   gemini-3.5/2.5   → 'none' zera; 'low' ainda gasta ~800 tokens pensando.
// Não dá para assumir. Se trocar de modelo, rodar _testar_gemini.mjs de novo.
const PROVEDORES = {
  gemini: {
    nome: 'Gemini',
    chave: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    // PADRÃO 2.5 (14/09/2026, depois de tomar erro de cota no 3.6). O 3.6-flash é o mais novo
    // da lista e modelo recém-lançado costuma ficar fora do free tier, ou entrar com cota
    // diária mínima: ele respondeu no teste e depois recusou a primeira chamada real. O
    // 2.5-flash é o que tem free tier documentado (500 requisições/dia).
    // Para tentar outro: GEMINI_MODEL=gemini-3.5-flash no .env.
    modelo: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    reasoning: null,   // resolvido abaixo, porque MUDA POR MODELO
    lote: 12,
    rpm: 10,              // free tier; a espera entre chamadas sai daqui, não do TPM
    limiteDia: 450,       // requisições (teto ~500, com margem)
    unidade: 'requisicoes',
    variavel: 'GEMINI_API_KEY',
  },
  groq: {
    nome: 'Groq',
    chave: process.env.GROK_API_KEY,   // nome herdado; o valor é da Groq
    baseURL: 'https://api.groq.com/openai/v1',
    modelo: process.env.GROK_MODEL || 'openai/gpt-oss-120b',
    reasoning: 'low',
    lote: 6,
    tpm: 8000,            // aqui a espera é pelo TPM, que é o gargalo real
    limiteDia: 190000,    // tokens
    unidade: 'tokens',
    variavel: 'GROK_API_KEY',
  },
};

// MEDIDO em coletores/_testar_gemini.mjs, e é contraintuitivo: a chave que zera o pensamento
// não é a mesma em todo modelo. No 3.6, 'none' devolve 400 e 'low' zera. No 3.5 e no 2.5 é o
// contrário: 'none' zera e 'low' ainda gasta ~800 tokens pensando. Errar isso não dá erro
// visível, só queima orçamento e corta o JSON no meio.
const RACIOCINIO_POR_MODELO = {
  'gemini-3.6-flash': 'low',
  'gemini-3.5-flash': 'none',
  'gemini-2.5-flash': 'none',
};

const P = USAR_GROQ ? PROVEDORES.groq : PROVEDORES.gemini;
if (P.reasoning === null) P.reasoning = RACIOCINIO_POR_MODELO[P.modelo] || 'none';
if (!P.chave) { console.error(`❌ Falta ${P.variavel} no .env.`); process.exit(1); }

const ia = new OpenAI({ apiKey: P.chave, baseURL: P.baseURL });
const MODELO = P.modelo;
const LOTE = P.lote;
const MAX_TOKENS_SAIDA = 4000;   // folgado: corte no meio devolve JSON quebrado e perde o lote
const MAX_TENTATIVAS = 3;
// Só usado quando a unidade é TOKEN (Groq): quanto um lote de 6 custa, medido em 13/09.
// No Gemini a conta é outra, um lote custa 1 requisição.
const CUSTO_MEDIO_LOTE = 3300;
const PRECO_ENTRADA = 0.15 / 1e6;
const PRECO_SAIDA = 0.60 / 1e6;

const PROMPT = `Você traduz textos de casas legislativas brasileiras para português comum, de forma ESTRITAMENTE factual.

Para cada item recebido, escreva duas coisas:
1. "frase": UMA frase dizendo o que o texto faz. No máximo 200 caracteres. Comece com verbo no presente (cria, altera, aumenta, proíbe, autoriza, revoga).
2. "contexto": 3 a 4 frases explicando, nesta ordem: que tipo de proposta é essa e o que ela é capaz de mudar; o que a ementa detalha sobre o conteúdo; e o que o resultado da votação significa para o andamento da proposta.

REGRAS INEGOCIÁVEIS:
- A CASA ESTÁ ESCRITA NA ENTRADA. Use SOMENTE ela. Nem toda votação é da Câmara dos Deputados: há votações do Senado Federal e de assembleias legislativas estaduais. Nunca escreva "Câmara" para uma votação que não seja da Câmara, e nunca chame de lei federal o que é lei estadual. Se a entrada disser que a casa é uma assembleia estadual, o texto alcança apenas aquele estado.
- NÃO opine. Nada de mérito, vantagem, desvantagem, impacto, elogio, crítica ou urgência.
- NÃO diga por que foi proposto, nem quem ganha ou perde com isso.
- NÃO compare partidos, candidatos ou governos.
- NÃO invente. Você recebe SOMENTE a ementa, não o texto integral da lei. Se a ementa apenas cita uma lei que será alterada sem dizer o que muda, escreva exatamente isso: que a ementa não detalha o conteúdo da mudança e que é preciso ler o documento oficial. Nunca preencha a lacuna com suposição.
- NÃO cite número de artigo, prazo, valor ou porcentagem que não esteja escrito na entrada.
- NÃO TROQUE AS PALAVRAS TÉCNICAS DO DOCUMENTO POR SINÔNIMOS. Se a ementa diz "cargo vago", escreva "cargo vago" e não "vaga temporária"; se diz "quadro permanente", não escreva "cargo efetivo". Trocar o termo muda o fato. Na dúvida, repita a palavra da ementa e explique o que ela significa, em vez de substituí-la.
- NÃO afirme o resultado da votação se a entrada disser que ele não foi registrado.
- Escreva para quem nunca estudou direito. Se precisar de um termo técnico, explique em seguida com palavras simples.
- NÃO use travessão. Use vírgula, ponto ou parênteses.
- Não repita a ementa palavra por palavra: o leitor já a tem na tela logo acima.

Responda SEMPRE e SOMENTE com um objeto JSON válido, sem texto antes ou depois, neste formato:
{"itens": [{"id": "<o id recebido>", "frase": "...", "contexto": "..."}]}
Devolva um objeto para CADA item recebido, na mesma ordem.`;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => n.toLocaleString('pt-BR');
const hoje = () => new Date().toISOString().slice(0, 10);

// ORÇAMENTO SEPARADO POR PROVEDOR. (consertado em 19/09/2026)
//
// O QUE ESTAVA ERRADO: havia um contador só, `tokens` e `requisicoes` no topo do arquivo, e
// toda chamada somava nos dois, fosse Gemini ou Groq. Como Gemini é medido em requisições e
// Groq em tokens, o gasto de um aparecia como consumo do outro.
//
// Flagrado na prática hoje: uma rodada no Gemini queimou 122.618 tokens, e o script passou a
// tratar a Groq como se ela tivesse gasto 122 mil dos 190 mil do dia dela. São contas
// diferentes, em empresas diferentes: a Groq não tinha gastado nada. O efeito era fechar o
// único caminho que restava quando o Gemini recusa.
//
// A intenção original continua válida e está preservada: dentro de UM provedor, o teto é da
// CONTA, não do script, então gerar_explicacao_votacoes.js e gerar_resumo_propostas.js seguem
// dividindo o mesmo balde. O que mudou é que agora existe um balde por provedor.
const ZERADO = () => ({ tokens: 0, entrada: 0, saida: 0, requisicoes: 0 });

function lerOrcamento() {
  try {
    const o = JSON.parse(fs.readFileSync(ARQUIVO_ORCAMENTO, 'utf8'));
    if (o.dia !== hoje()) throw new Error('outro dia');
    // Migração do formato antigo (contadores soltos na raiz). Os números que existirem vão
    // para o Gemini, porque `requisicoes` só é incrementada de forma significativa por ele;
    // atribuir aos dois repetiria exatamente o bug que esta mudança conserta.
    if (o.tokens !== undefined && !o.gemini && !o.groq) {
      return { dia: o.dia, gemini: { tokens: o.tokens || 0, entrada: o.entrada || 0, saida: o.saida || 0, requisicoes: o.requisicoes || 0 }, groq: ZERADO() };
    }
    return { dia: o.dia, gemini: { ...ZERADO(), ...(o.gemini || {}) }, groq: { ...ZERADO(), ...(o.groq || {}) } };
  } catch { }
  return { dia: hoje(), gemini: ZERADO(), groq: ZERADO() };
}
function salvarOrcamento(o) {
  try { fs.writeFileSync(ARQUIVO_ORCAMENTO, JSON.stringify(o, null, 2)); } catch { }
}
const orcamento = lerOrcamento();
// A conta do provedor em uso. Tudo abaixo lê e escreve AQUI, nunca na raiz do orçamento.
const conta = () => (USAR_GROQ ? orcamento.groq : orcamento.gemini);
// Cada provedor é medido na SUA unidade. Contar tokens no Gemini seria olhar para o
// indicador errado: lá sobra token e falta requisição.
const usado = () => (P.unidade === 'requisicoes' ? conta().requisicoes : conta().tokens);
const restante = () => P.limiteDia - usado();
const custoDeUmLote = () => (P.unidade === 'requisicoes' ? 1 : CUSTO_MEDIO_LOTE);

// Mesma armadilha documentada em gerar_resumo_propostas.js: a Groq devolve 429 tanto para o
// limite por minuto quanto para o do dia, e a mensagem só difere em "per minute" x "per day".
// Tratar os dois como espera faz o script girar em looping por uma janela que só abre amanhã.
// Groq diz "per day"/"TPD"; Google diz "RESOURCE_EXHAUSTED" ou "quota". Tratar cota diária
// como espera faz o script girar em looping por uma janela que só abre amanhã.
const ehLimiteDiario = (e) => /per day|\bTPD\b|requests per day|\bRPD\b|RESOURCE_EXHAUSTED|quota exceeded|exceeded your current quota/i.test(e.message || '');
function segundosDoRateLimit(e) {
  const m = /try again in ([\d.]+)s/i.exec(e.message || '');
  return m ? Math.ceil(parseFloat(m[1])) + 1 : 20;
}

// Hífens exóticos que o modelo copia dos documentos (inclusive o travessão, proibido nos
// textos visíveis do site pelas Diretrizes de Design), espaço duplicado e "50 %".
function limparTexto(t) {
  const limpo = String(t || '')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/(\d)\s+%/g, '$1%')
    .trim();
  // O prompt manda começar com verbo, e o modelo obedece ao pé da letra: as 12 primeiras
  // saíram em minúscula ("estabelece regras sobre..."). Mesma correção que já existe em
  // gerar_resumo_propostas.js.
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// GUARDA CONTRA INVENÇÃO. O modelo só recebeu a ementa; se a resposta traz um número que não
// estava na entrada, ele saiu do documento e foi buscar na memória. Isso é exatamente o tipo
// de erro que o leitor não tem como detectar, então o item é descartado em vez de salvo.
// GUARDA CONTRA CÓPIA (14/09/2026). Quando a "frase em linguagem comum" é o começo da ementa,
// ela é PIOR que não existir: na tela ela vira o <h1> no lugar da ementa inteira, então o leitor
// troca um texto difícil porém completo por um recorte truncado, às vezes só o número da lei.
// Nesse caso o certo é não gravar nada: sem frase, a página mostra a ementa completa como
// título, que é estritamente melhor. Medido: 85 das 771 primeiras saíram assim.
function ehCopiaDaEmenta(frase, ementa) {
  const limpa = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const f = limpa(frase), e = limpa(ementa);
  if (!f || !e) return false;
  return e.startsWith(f.slice(0, Math.min(f.length, 60)));
}

function inventouNumero(resposta, entrada) {
  const numerosDaEntrada = new Set((entrada.match(/\d+/g) || []));
  const numerosDaResposta = (resposta.match(/\d+/g) || []);
  return numerosDaResposta.some((n) => n.length >= 2 && !numerosDaEntrada.has(n));
}

async function chamarIA(usuario) {
  if (restante() <= 0) {
    const err = new Error('LIMITE_DIARIO'); err.diario = true; throw err;
  }
  let tentativa = 0;
  while (true) {
    try {
      const resp = await ia.chat.completions.create({
        model: MODELO,
        max_tokens: MAX_TOKENS_SAIDA,
        reasoning_effort: P.reasoning,
        // Estava no padrão (1.0) na primeira rodada, e foi aí que "cargos vagos no quadro
        // permanente" virou "vagas temporárias em cargos efetivos". Temperatura alta faz o
        // modelo buscar palavra mais "natural" que a do documento - exatamente o que não
        // pode acontecer aqui. Perto de zero ele repete o termo da ementa.
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: usuario },
        ],
      });

      const u = resp.usage;
      const c = conta();
      c.tokens += u.total_tokens || 0;
      c.entrada += u.prompt_tokens || 0;
      c.saida += u.completion_tokens || 0;
      c.requisicoes += 1;
      salvarOrcamento(orcamento);

      const conteudo = resp.choices?.[0]?.message?.content;
      if (!conteudo) throw new Error('Resposta vazia da IA.');
      let obj;
      try { obj = JSON.parse(conteudo); } catch { throw new Error('JSON malformado na resposta da IA.'); }
      if (!Array.isArray(obj.itens)) throw new Error('Resposta sem o campo "itens".');

      // A espera tem que mirar o gargalo CERTO. Na Groq é o TPM, então ela é proporcional aos
      // tokens gastos. No Gemini sobra token e o que aperta é requisição por minuto, então a
      // espera é fixa, derivada do RPM. Usar a fórmula da Groq no Gemini daria 0,4s e tomaria 429.
      const espera = P.unidade === 'requisicoes'
        ? Math.ceil((60000 / P.rpm) * 1.1)
        : Math.ceil(((u.total_tokens || 0) / P.tpm) * 60000 * 1.15);
      await dormir(Math.max(2000, espera));
      return obj.itens;
    } catch (e) {
      if (ehLimiteDiario(e)) {
        // NÃO engolir a mensagem original. A primeira versão levantava um erro genérico e
        // o Jordy viu "cota atingida" com o contador em 10 de 450, sem nenhuma pista do que
        // o provedor tinha dito. Erro de diagnóstico é pior que o erro em si.
        const err = new Error('LIMITE_DIARIO');
        err.diario = true;
        err.original = String(e.message || '').slice(0, 500);
        throw err;
      }
      if (e.status === 429 || /rate.?limit|too large/i.test(e.message || '')) {
        const s = segundosDoRateLimit(e);
        console.warn(`     ⏳ limite por minuto atingido - aguardando ${s}s…`);
        await dormir(s * 1000);
        continue; // espera não gasta tentativa
      }
      if (++tentativa < MAX_TENTATIVAS) {
        console.warn(`     ↩️  ${e.message} - tentando de novo (${tentativa}/${MAX_TENTATIVAS})…`);
        await dormir(1500);
        continue;
      }
      throw e;
    }
  }
}

// Códigos crus do banco ("A", "R") NÃO podem chegar ao modelo: na primeira rodada ele recebeu
// "A", teve que adivinhar, e escreveu para o leitor 'o resultado indicado como "A" confirma a
// aprovação' - expondo um código interno numa tela feita para quem não é do ramo. São 75 linhas
// assim. Aqui o resultado é traduzido ANTES, pela mesma regra que a tela usa.
function resultadoLegivel(v) {
  const bruto = (v.resultado || '').trim();
  const ehCodigo = bruto.length <= 2;              // "A", "R"
  if (bruto && !ehCodigo) return bruto;
  const { status } = humanizarVotacao({ descricao_votacao: v.descricao, aprovacao: v.aprovacao });
  if (status) return status;                        // "Aprovado" / "Rejeitado"
  if (bruto === 'A') return 'Aprovado';
  if (bruto === 'R') return 'Rejeitado';
  return null;
}

function montarEntrada(v) {
  const partes = [`id: ${v.votacao_id_externa}`];

  // A CASA VAI PRIMEIRO, E ISSO FOI UM CONSERTO. (19/09/2026)
  // Até aqui a entrada não dizia de que casa era a votação, e o `explicarTipo` abaixo, que o
  // modelo recebe rotulado como verdade, tinha texto escrito para a Câmara. Medido no banco:
  // 17 textos publicados errados, entre eles 7 votações da Assembleia gaúcha descritas como
  // "decisão tomada no plenário da Câmara", tratando de Defesa Civil estadual e do Balanço
  // Geral do Estado. O modelo não errou sozinho: ele repetiu o que mandamos tratar como fato.
  const casa = casaDaVotacao(v);
  if (casa) partes.push(`casa (use SOMENTE esta, não assuma outra): ${casa.nome} (âmbito ${casa.ambito.toLowerCase()})`);

  if (v.proposicao_titulo) partes.push(`proposta: ${v.proposicao_titulo}`);
  if (v.ementa) partes.push(`ementa oficial: ${v.ementa}`);
  if (v.descricao) partes.push(`descrição da votação: ${v.descricao}`);

  // Material factual que o site já deriva por regra. Entregar isso pronto tira do modelo a
  // necessidade de deduzir que tipo de proposta é essa - que é onde ele costuma escorregar.
  const tipo = explicarTipo(`${v.descricao || ''} ${v.proposicao_titulo || ''}`, casa);
  if (tipo?.termo) partes.push(`tipo de votação (já apurado, use como verdade): ${tipo.termo} - ${tipo.texto}`);

  const resultado = resultadoLegivel(v);
  // Buraco explícito em vez de silêncio: campo ausente é convite para o modelo preencher.
  partes.push(resultado ? `resultado: ${resultado}` : 'resultado: não registrado nesta base - NÃO afirme se foi aprovada ou rejeitada');
  return partes.join('\n');
}

async function main() {
  console.log(`🚀 Explicação das votações - ${P.nome}, modelo ${MODELO}, ${LOTE} por chamada`);
  console.log(`📊 Uso de hoje (${orcamento.dia}): ${fmt(usado())} de ${fmt(P.limiteDia)} ${P.unidade}, ${fmt(restante())} livres`);
  if (P.unidade === 'requisicoes') console.log(`   (tokens hoje: ${fmt(conta().tokens)} - no Gemini token não é o gargalo, requisição é)`);
  console.log();

  if (restante() < custoDeUmLote() * 2) {
    console.log(`🛑 Cota de hoje do ${P.nome} esgotada. Rode amanhã, ou use o outro provedor:`);
    console.log(USAR_GROQ ? '   node coletores/gerar_explicacao_votacoes.js' : '   node coletores/gerar_explicacao_votacoes.js --groq');
    return;
  }

  let q = supabase
    .from('votacoes')
    .select('votacao_id_externa, proposicao_titulo, ementa, descricao, resultado, aprovacao, data_voto')
    .not('ementa', 'is', null)
    .order('data_voto', { ascending: false });
  // O marcador de "já processei esta" é explicacao_gerada_em, NÃO explicacao_cidada.
  // Motivo (15/09/2026): quando a ementa já está em português comum ("Equipara as pessoas com
  // fibromialgia às pessoas com deficiência") não existe frase a escrever, e o campo fica nulo
  // de propósito. Se a fila olhasse explicacao_cidada, essas votações voltariam para a fila
  // em toda rodada, para sempre, e pagaríamos de novo pelo mesmo trabalho.
  if (!FORCE) q = q.is('explicacao_gerada_em', null);
  if (LIMITE) q = q.limit(LIMITE);

  const { data: votacoes, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }
  if (!votacoes.length) { console.log('✅ Todas as votações já têm explicação. Nada a fazer.'); return; }

  const lotes = [];
  for (let i = 0; i < votacoes.length; i += LOTE) lotes.push(votacoes.slice(i, i + LOTE));
  const cabem = Math.min(lotes.length, Math.floor(restante() / custoDeUmLote()));
  const sobram = Math.max(0, votacoes.length - cabem * LOTE);
  console.log(`📥 ${fmt(votacoes.length)} votação(ões) na fila, em ${lotes.length} lote(s) de até ${LOTE}.`);
  console.log(`   Cabem ~${cabem} lote(s) na cota de hoje${sobram ? ` (~${fmt(sobram)} ficam para amanhã)` : ' - dá para terminar tudo hoje'}.`);
  if (P.unidade === 'requisicoes') console.log(`   Espera de ${(60 / P.rpm).toFixed(0)}s entre chamadas (limite de ${P.rpm} por minuto): ~${Math.ceil(cabem * (60 / P.rpm) / 60)} min de rodada.`);
  console.log();

  let ok = 0, descartados = 0, lotesFeitos = 0, semFrase = 0;
  for (const lote of lotes) {
    let itens;
    try {
      itens = await chamarIA(lote.map(montarEntrada).join('\n---\n'));
    } catch (e) {
      if (e.diario || e.message === 'LIMITE_DIARIO') {
        console.log(`\n  ⏸️  ${P.nome} recusou por cota. Nada foi perdido: o script retoma de onde parou.`);
        if (e.original) console.log(`     Resposta do provedor: ${e.original}`);
        console.log(`     Modelo em uso: ${MODELO}. Se a cota deste modelo acabou, tente outro:`);
        console.log(`       GEMINI_MODEL=gemini-3.5-flash no .env, ou rode pela Groq com --groq`);
        break;
      }
      console.warn(`  ⚠️  lote falhou: ${e.message}`);
      continue;
    }

    // Salva um por um, e só o que passou na guarda. Um item ruim no lote não derruba os outros.
    for (const item of itens) {
      const v = lote.find((x) => String(x.votacao_id_externa) === String(item.id));
      if (!v) { descartados++; continue; }
      const fraseBruta = limparTexto(item.frase);
      const contexto = limparTexto(item.contexto);
      // Sem contexto não há nada a salvar. Sem frase ainda há (ver guarda abaixo).
      if (fraseBruta.length < 15 || contexto.length < 40) { descartados++; continue; }

      // A guarda derruba A FRASE, não o item inteiro. Corrigido em 15/09/2026: antes eu
      // descartava tudo, e junto ia embora o contexto_extra, que continuava correto e é o que
      // alimenta o botão "quero entender melhor". Sem frase a tela usa a ementa como título,
      // que nesses casos é exatamente o texto certo, e o botão segue aparecendo.
      let frase = fraseBruta;
      if (ehCopiaDaEmenta(frase, v.ementa)) { frase = null; semFrase++; }
      else if (/e d[áa] outras provid[êe]ncias|nos termos do art/i.test(frase)) { frase = null; semFrase++; }

      const entrada = montarEntrada(v);
      if ((frase && inventouNumero(frase, entrada)) || inventouNumero(contexto, entrada)) {
        console.warn(`     🚫 ${v.votacao_id_externa}: resposta cita número que não está na ementa - descartada.`);
        descartados++;
        continue;
      }

      const { error: upErr } = await supabase.from('votacoes').update({
        explicacao_cidada: frase,   // pode ser null de propósito: ementa já legível
        contexto_extra: contexto,
        explicacao_gerada_em: new Date().toISOString(),
        explicacao_modelo: MODELO,
      }).eq('votacao_id_externa', v.votacao_id_externa);
      if (upErr) { console.warn(`     ⚠️  ${v.votacao_id_externa}: ${upErr.message}`); descartados++; continue; }
      ok++;
    }
    lotesFeitos++;
    process.stdout.write(`\r  📝 ${lotesFeitos}/${lotes.length} lotes · ${ok} explicadas · ${fmt(restante())} ${P.unidade} livres   `);
  }

  const custo = conta().entrada * PRECO_ENTRADA + conta().saida * PRECO_SAIDA;
  console.log('\n──────────────────────────────────────────────');
  console.log(`✅ ${ok} votação(ões) processada(s)${semFrase ? ` · ✂️ ${semFrase} sem frase própria (ementa já legível, só contexto)` : ''}${descartados ? ` · 🚫 ${descartados} descartada(s) pela guarda` : ''}`);
  console.log(`📊 Consumo de hoje no ${P.nome}: ${fmt(conta().requisicoes)} requisições e ${fmt(conta().tokens)} tokens (${fmt(conta().entrada)} entrada + ${fmt(conta().saida)} saída). Livres em ${P.unidade}: ${fmt(restante())}`);
  console.log(`💵 Equivalente no tier pago: US$ ${custo.toFixed(4)} - no free, zero.`);

  const { count } = await supabase.from('votacoes').select('*', { count: 'exact', head: true }).is('explicacao_gerada_em', null);
  if (count) {
    // Bug da primeira versão: isto dizia "rode amanhã" sempre, mesmo com 48 mil tokens livres.
    // Sobrar fila e acabar orçamento são coisas diferentes.
    const cabemAinda = Math.floor(restante() / custoDeUmLote()) * LOTE;
    if (cabemAinda <= 0) {
      console.log(`\n⏸️  Faltam ${fmt(count)} votação(ões) e a cota de hoje do ${P.nome} acabou.`);
      console.log(USAR_GROQ ? '   Tente pelo Gemini: node coletores/gerar_explicacao_votacoes.js'
                            : '   Tente pela Groq: node coletores/gerar_explicacao_votacoes.js --groq');
    } else {
      console.log(`\n▶️  Faltam ${fmt(count)} votação(ões), e ainda cabem ~${fmt(Math.min(cabemAinda, count))} no orçamento de HOJE.`);
      // O aviso precisa saber COM QUE COMANDO você rodou. Dizer "pode rodar de novo" para quem
      // está com --force faz a pessoa reprocessar as mesmas 12 e queimar orçamento sem mudar
      // nada - aconteceu em 13/09/2026, e o custo foi meu erro, não do script.
      if (FORCE) console.log(`   Atenção: com --force o script REFAZ as mesmas. Para avançar nas que faltam, rode SEM --force${LIMITE ? ' e sem --n' : ''}.`);
      else console.log(`   Pode rodar o mesmo comando de novo agora.`);
    }
  }
}

main().catch((e) => { console.error('💥 Erro:', e.message); process.exit(1); });
