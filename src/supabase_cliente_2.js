import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// SEGUNDO BANCO do projeto (criado em 24/09/2026).
//
// Por que existe: o banco 1 chegou perto do teto do plano gratuito (395 MB de 500) e ainda
// faltam coletar os candidatos a governador e a deputado estadual, que sozinhos sao mais de
// 13 mil linhas com ficha completa. Em vez de apagar dado para caber, a coleta nova nasce aqui.
//
// MUDOU EM 25/09/2026: os deputados estaduais passaram a ser lidos do TSE na hora, sem banco, e
// o banco 2 ficou vazio. Pedido do Jordy: ele virou o banco do PERFIL DO USUARIO
// (supabase/banco2/001_perfis_afinidade.sql). A regra de antes vale ao contrario: dado de gente
// fica sozinho aqui, e NADA publico do site entra neste banco.
//
// Este cliente usa a chave de SERVICO e existe so para o servidor (ex.: apagar conta). O perfil
// visto pela propria pessoa passa por src/lib/perfilUsuario.js, com a chave publicavel e a RLS.
//
// Mesmas variaveis do banco 1, com o sufixo _2. Falta de chave aqui NAO derruba o site: quem
// usa este cliente e so a parte nova, e o resto da pagina tem que continuar de pe.
const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const url = process.env.SUPABASE_URL_2;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY_2;

export const banco2Configurado = Boolean(url && chave);

if (!banco2Configurado) {
    console.warn('[banco 2] SUPABASE_URL_2 / SUPABASE_SERVICE_ROLE_KEY_2 ausentes: o que depende do banco 2 vai voltar vazio.');
}

const supabase2 = banco2Configurado ? createClient(url, chave) : null;

export default supabase2;
