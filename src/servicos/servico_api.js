import supabase from '../supabase_cliente.js';
import { garantirResumo } from '../lib/siconfi.js';
import { agruparPorMateria } from '../lib/votacao.js';
import { casaDoPerfil } from '../lib/casa.js';

const ServicoAPI = {
    // Busca o ranking de maiores gastadores
    getRankingGeral: async (ano) => {
        console.log(`📊 Buscando ranking de ${ano}...`);

        const { data, error } = await supabase
            .from('despesas_parlamentares')
            .select(`
                valor_liquido,
                ano,
                agentes_politicos (
                    id,
                    nome_urna,
                    partido_atual,
                    foto_url,
                    casa_legislativa,
                    cargo_atual
                )
            `)
            .eq('ano', parseInt(ano))
            .not('agente_id', 'is', null);

        if (error) {
            console.error("Erro Supabase:", error.message);
            return [];
        }

        const rankingMap = data.reduce((acc, item) => {
            const p = item.agentes_politicos;
            const nomeFinal = p?.nome_urna || 'Parlamentar Sem Nome';

            if (!acc[nomeFinal]) {
                acc[nomeFinal] = {
                    id: p?.id, // Importante para o link clicável
                    nome: nomeFinal,
                    total: 0,
                    partido: p?.partido_atual || 'S/P',
                    foto_url: p?.foto_url || '',
                    casa: p?.casa_legislativa || 'Câmara',
                    cargo: p?.cargo_atual || 'Parlamentar' // Para o badge de cargo
                };
            }

            acc[nomeFinal].total += parseFloat(item.valor_liquido || 0);
            return acc;
        }, {});

        // Mediana geral dos gastos (referência robusta para anomalia)
        const todos = Object.values(rankingMap);
        const totais = todos.map((p) => p.total).sort((a, b) => a - b);
        const meio = Math.floor(totais.length / 2);
        const mediana = totais.length === 0 ? 0
            : (totais.length % 2 !== 0 ? totais[meio] : (totais[meio - 1] + totais[meio]) / 2);

        // Ordena, pega Top 10 e anexa a anomalia de cada um vs. a mediana
        return todos
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map((p) => ({
                ...p,
                mediana,
                percentual_acima: mediana > 0 ? ((p.total / mediana) - 1) * 100 : 0,
                anomalia: mediana > 0 && p.total >= mediana * 2,
            }));
    },

    // Busca gastos por categoria para gráficos
    getGastosPorCategoria: async (ano) => {
        const { data, error } = await supabase
            .from('despesas_parlamentares')
            .select('categoria_normalizada, valor_liquido')
            .eq('ano', parseInt(ano));

        if (error) return [];
        return data;
    },

    // Busca dados detalhados de um único político pelo UUID
    getPoliticoCompleto: async (id) => {
        console.log(`🔍 Buscando detalhes do político: ${id}...`);

        // 1. Busca os dados básicos do Agente
        const { data: perfil, error: errorPerfil } = await supabase
            .from('agentes_politicos')
            .select('*')
            .eq('id', id)
            .single();

        if (errorPerfil) {
            console.error("Erro ao buscar perfil:", errorPerfil.message);
            return null;
        }

        // 2. Busca o resumo de gastos dele (ADICIONADO: tipo_despesa, fornecedor_nome, url_documento, mes)
        const { data: gastos, error: errorGastos } = await supabase
            .from('despesas_parlamentares')
            .select(`
                valor_liquido,
                categoria_normalizada,
                data_emissao,
                id_externo_documento,
                tipo_despesa,
                fornecedor_nome,
                fornecedor_cnpj_cpf,
                url_documento,
                mes,
                ano
            `)
            .eq('agente_id', id);

        if (errorGastos) {
            console.error("Erro ao buscar gastos:", errorGastos.message);
        }

        // Série histórica: agrupa por ANO e por MÊS (todos os anos com dados)
        const todosGastos = gastos || [];
        const serie = {};
        for (const g of todosGastos) {
            const a = g.ano; if (!a) continue;
            const v = parseFloat(g.valor_liquido || 0);
            if (!serie[a]) serie[a] = { total: 0, meses: {}, cats: {}, n_notas: 0 };
            serie[a].total += v;
            if (g.mes) serie[a].meses[g.mes] = (serie[a].meses[g.mes] || 0) + v;
            const cat = g.categoria_normalizada || 'Outros';
            serie[a].cats[cat] = (serie[a].cats[cat] || 0) + v;
            serie[a].n_notas++;
        }
        const anosDisponiveis = Object.keys(serie).map(Number).sort((a, b) => b - a);
        const anoReferencia = anosDisponiveis.includes(2026) ? 2026 : (anosDisponiveis[0] || 2026);
        const serieMensal = anosDisponiveis.map((a) => {
            const catEntries = Object.entries(serie[a].cats || {}).sort((x, y) => y[1] - x[1]);
            return {
                ano: a,
                total: serie[a].total,
                meses: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valor: serie[a].meses[i + 1] || 0 })),
                meses_com_gasto: Object.keys(serie[a].meses).length,
                n_notas: serie[a].n_notas,
                maior_categoria: catEntries[0]?.[0] || null,
            };
        });

        // Agregados do veredito usam o ANO DE REFERÊNCIA (atual, ou o mais recente com dados)
        const gastosAno = todosGastos.filter((g) => g.ano === anoReferencia);

        // Processa os gastos do ano de referência em resumo por categoria
        const categorias = gastosAno.reduce((acc, item) => {
            const cat = item.categoria_normalizada || 'Outros';
            acc[cat] = (acc[cat] || 0) + parseFloat(item.valor_liquido || 0);
            return acc;
        }, {});

        // 3. Busca TODOS os votos do parlamentar (para coerência) e exibe os recentes
        const { data: votosTodos } = await supabase
            .from('votos_parlamentares')
            .select('voto_tipo, data_voto, ementa_resumida_voto, aprovacao, votacao_id_externa')
            .eq('agente_id', id)
            .order('data_voto', { ascending: false });

        // Busca ementa real da proposição para os votos mais recentes (o que estava sendo decidido)
        const idsVotacoes = [...new Set((votosTodos || []).slice(0, 40).map((v) => v.votacao_id_externa).filter(Boolean))];
        let metaVotacoes = {};
        if (idsVotacoes.length > 0) {
            const { data: votacoesData } = await supabase
                .from('votacoes')
                .select('votacao_id_externa, ementa, proposicao_titulo, descricao, situacao, keywords, ementa_detalhada, regime, url_inteiro_teor')
                .in('votacao_id_externa', idsVotacoes);
            for (const v of votacoesData || []) {
                metaVotacoes[v.votacao_id_externa] = v;
            }
        }

        const votos = (votosTodos || []).slice(0, 40).map((v) => {
            const m = metaVotacoes[v.votacao_id_externa] || {};
            return {
                ...v,
                ementa_votacao: m.ementa || null,
                ementa: m.ementa || null,            // p/ agruparPorMateria
                descricao: m.descricao || null,       // p/ papelVotacao (etapa do processo)
                proposicao_titulo: m.proposicao_titulo || null,
                situacao: m.situacao || null,
                keywords: m.keywords || null,
                ementa_detalhada: m.ementa_detalhada || null,
                regime: m.regime || null,
                url_inteiro_teor: m.url_inteiro_teor || null,
            };
        });
        const resumo_votos = (votosTodos || []).reduce((acc, v) => {
            const t = v.voto_tipo || 'Outro';
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {});

        // 4. Índice de Coerência Partidária: alinhamento com a maioria do próprio partido
        let coerencia = null;
        const partido = perfil.partido_atual;
        if (partido) {
            const { data: votosPartido } = await supabase
                .from('votos_parlamentares')
                .select('votacao_id_externa, voto_tipo, agentes_politicos!inner(partido_atual)')
                .eq('agentes_politicos.partido_atual', partido);

            const contagem = {};
            for (const v of votosPartido || []) {
                if (v.voto_tipo !== 'Sim' && v.voto_tipo !== 'Não') continue;
                contagem[v.votacao_id_externa] = contagem[v.votacao_id_externa] || { Sim: 0, 'Não': 0 };
                contagem[v.votacao_id_externa][v.voto_tipo]++;
            }
            const maioria = {};
            for (const [vid, c] of Object.entries(contagem)) {
                maioria[vid] = c.Sim >= c['Não'] ? 'Sim' : 'Não';
            }

            let alinhados = 0, considerados = 0;
            for (const v of votosTodos || []) {
                if (v.voto_tipo !== 'Sim' && v.voto_tipo !== 'Não') continue;
                const m = maioria[v.votacao_id_externa];
                if (!m) continue;
                considerados++;
                if (m === v.voto_tipo) alinhados++;
            }
            if (considerados > 0) {
                coerencia = { percentual: (alinhados / considerados) * 100, alinhados, considerados, partido };
            }
        }

        // 5. Presença nas votações nominais (registrou voto ÷ total de votações da casa no período)
        let presenca = null;
        try {
            const { data: pres } = await supabase.rpc('presenca_votacoes', { p_agente: id });
            if (pres && pres.total > 0) {
                presenca = {
                    compareceu: pres.compareceu,
                    total: pres.total,
                    casa: pres.casa,
                    percentual: (pres.compareceu / pres.total) * 100,
                };
            }
        } catch (e) { console.error('presenca_votacoes:', e.message); }

        const total_geral = Object.values(categorias).reduce((a, b) => a + b, 0);
        const n_notas = gastosAno.length;
        const mesesSet = new Set(gastosAno.map((g) => g.mes).filter(Boolean));
        const media_mensal = mesesSet.size > 0 ? total_geral / mesesSet.size : total_geral;
        const maiorCategoria = Object.entries(categorias).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        return {
            perfil,
            resumo_gastos: categorias,
            total_geral,
            n_notas,
            media_mensal,
            maior_categoria: maiorCategoria,
            lista_detalhada: gastosAno,
            serie_mensal: serieMensal,
            anos_disponiveis: anosDisponiveis,
            ano_referencia: anoReferencia,
            meses_com_gasto: mesesSet.size,
            votos,
            resumo_votos,
            coerencia,
            presenca
        };
    },

    // Lista todos os deputados federais (para a página /deputados, com busca no cliente)
    listarDeputados: async () => {
        const { data, error } = await supabase
            .from('agentes_politicos')
            .select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, cargo_atual, fonte_api')
            .or('fonte_api.ilike.%camara%,fonte_api.ilike.%senado%,fonte_api.ilike.%alesp%,fonte_api.ilike.%alergs%')
            .order('nome_urna', { ascending: true });
        if (error) { console.error('listarDeputados:', error.message); return []; }
        return (data || []).map((d) => {
            const fonte = (d.fonte_api || '').toLowerCase();
            // Cada assembleia é uma casa própria ('Assembleia (SP)', 'Assembleia (RS)'...), porque
            // cada uma publica coisas diferentes e a página as trata como abas separadas.
            const casa = fonte.includes('senado') ? 'Senado'
                : fonte.includes('alesp') ? 'Assembleia (SP)'
                : fonte.includes('alergs') ? 'Assembleia (RS)'
                : 'Câmara';
            const ehEstadual = casa.startsWith('Assembleia');
            const cargo = d.cargo_atual || (casa === 'Senado' ? 'Senador(a)' : ehEstadual ? 'Deputado(a) Estadual' : 'Deputado(a) Federal');
            return {
                id: d.id,
                slug: d.slug,
                nome: d.nome_urna,
                partido: d.partido_atual || 'S/P',
                uf: d.uf_sede || '',
                foto_url: d.foto_url || '',
                casa,
                cargo,
            };
        });
    },

    // Votações nominais mais recentes (deduplicadas) para a home
    getVotacoesRecentes: async (limite = 6) => {
        // Votações recentes AGRUPADAS por matéria (1 card por proposta, com a linha do tempo + contexto).
        const { data } = await supabase
            .from('votacoes')
            .select('votacao_id_externa, descricao, aprovacao, data_voto, proposicao_id, proposicao_titulo, ementa, descricao_tipo, resultado, autor_nome, keywords, situacao, ementa_detalhada, regime, url_inteiro_teor')
            .order('data_voto', { ascending: false })
            .limit(250);
        return agruparPorMateria(data || []).slice(0, limite);
    },

    // Todas as votações (para a página de lista, com busca por assunto/autor/data)
    listarVotacoes: async () => {
        const { data, error } = await supabase
            .from('votacoes')
            .select('votacao_id_externa, descricao, aprovacao, data_voto, proposicao_titulo, ementa, descricao_tipo, resultado, autor_nome, keywords, situacao, ementa_detalhada, regime, url_inteiro_teor')
            .order('data_voto', { ascending: false });
        if (error) { console.error('listarVotacoes:', error.message); return []; }
        return data || [];
    },

    // Radar da Cota: quem mais usou a verba pública no ano (dado completo)
    getRadarGastos: async (ano = 2026, limite = 6, casa = null) => {
        let q = supabase
            .from('radar_gastos')
            .select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, casa, total, n_notas')
            .eq('ano', ano);
        if (casa) q = q.eq('casa', casa);
        const { data, error } = await q.order('total', { ascending: false }).limit(limite);
        if (error) { console.error('getRadarGastos:', error.message); return []; }
        return data || [];
    },

    // Rankings de TODAS as casas e TODOS os anos de uma vez, para o seletor de ano da página
    // /deputados trocar na hora, sem nova requisição. A radar_gastos e uma view materializada
    // pequena (uma linha por parlamentar/ano, ~1,5 mil linhas), entao trazer tudo sai mais barato
    // do que uma consulta por combinacao. Mesmo padrao do ranking de /gastos-publicos.
    //
    // Retorna { [casa]: { anos: [desc], porAno: { [ano]: [top N] }, totais: { [ano]: quantos } } }
    // `totais` conta TODOS os parlamentares do ano, nao so os do top N: e o que permite a tela
    // saber que um ano esta incompleto (a lista cortada em 10 nunca revelaria isso).
    getRadaresPorCasaEAno: async (limite = 10) => {
        // ⚠️ O Supabase corta em 1.000 linhas por requisicao. A radar_gastos ja tem ~1.560,
        // e ordenada por valor as primeiras mil sao todas Camara/Senado/SP: os gastos estaduais
        // do RS sao menores (cota mensal ~R$27 mil contra ~R$54 mil da federal) e ficavam TODOS
        // abaixo do corte. Resultado: a aba do RS aparecia sem ranking como se nao houvesse dado.
        // Por isso paginamos ate acabar, em vez de confiar numa consulta unica.
        const PAGINA = 1000;
        const todas = [];
        for (let inicio = 0; ; inicio += PAGINA) {
            const { data: pagina, error } = await supabase
                .from('radar_gastos')
                .select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, casa, ano, total, n_notas, meses_com_gasto, situacao_atual, condicao_eleitoral')
                .order('total', { ascending: false })
                .range(inicio, inicio + PAGINA - 1);
            if (error) { console.error('getRadaresPorCasaEAno:', error.message); break; }
            todas.push(...(pagina || []));
            if (!pagina || pagina.length < PAGINA) break;
        }
        if (!todas.length) return {};

        // Guardamos as DUAS pontas. Mostrar so quem mais gastou e, por si, uma escolha
        // editorial: sugere que gastar mais e a historia. Com as duas pontas o leitor ganha
        // a regua que falta para julgar se um valor e alto ou baixo, e o site nao precisa
        // opinar. O custo e zero: as ~1.560 linhas ja foram todas baixadas aqui.
        const fora = {};
        for (const linha of todas) {
            if (!linha.casa || !linha.ano) continue;
            fora[linha.casa] = fora[linha.casa] || { anos: [], porAno: {}, porAnoMenores: {}, totais: {} };
            const balde = fora[linha.casa];
            balde.porAno[linha.ano] = balde.porAno[linha.ano] || [];
            balde.porAnoMenores[linha.ano] = balde.porAnoMenores[linha.ano] || [];
            balde.totais[linha.ano] = (balde.totais[linha.ano] || 0) + 1;
            // ja vem ordenado por total desc; so corta no limite
            if (balde.porAno[linha.ano].length < limite) balde.porAno[linha.ano].push(linha);
            // a outra ponta: mantem uma janela deslizante com os `limite` menores vistos ate aqui
            const menores = balde.porAnoMenores[linha.ano];
            menores.push(linha);
            if (menores.length > limite) menores.shift();
        }
        for (const casa of Object.keys(fora)) {
            fora[casa].anos = Object.keys(fora[casa].porAno).map(Number).sort((a, b) => b - a);
            // do menor para o maior, que e a leitura natural de "quem menos usou"
            for (const ano of Object.keys(fora[casa].porAnoMenores)) {
                fora[casa].porAnoMenores[ano].reverse();
            }
        }
        return fora;
    },

    // Uma fatia do ranking de uma casa/ano, para o botao "ver mais 10".
    // Nao reaproveitamos getRadaresPorCasaEAno aqui de proposito: aquela baixa as ~1.560
    // linhas inteiras para montar todas as abas de uma vez, o que faz sentido uma vez por
    // pageview e nao a cada clique. Esta e uma consulta direta, com range no banco.
    // Medido em 12/09/2026: mandar 50 linhas por casa/ano/ponta no payload da pagina levaria
    // /deputados de 248 kB para ~502 kB para todo leitor, inclusive quem nunca expande.
    getRadarFatia: async ({ casa, ano, sentido = 'maiores', offset = 0, limite = 10 }) => {
        const asc = sentido === 'menores';
        const { data, error } = await supabase
            .from('radar_gastos')
            .select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, casa, ano, total, n_notas, meses_com_gasto, situacao_atual, condicao_eleitoral')
            .eq('casa', casa)
            .eq('ano', ano)
            .order('total', { ascending: asc })
            .range(offset, offset + limite - 1);
        if (error) { console.error('getRadarFatia:', error.message); return []; }
        return data || [];
    },

    // Ranking de gastos dos deputados de um estado (página /estado/[uf])
    getRadarPorEstado: async (uf, ano = 2026) => {
        const { data, error } = await supabase
            .from('radar_gastos')
            .select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, total, n_notas, casa, meses_com_gasto')
            .eq('ano', ano)
            .eq('uf_sede', uf)
            .order('total', { ascending: false });
        if (error) { console.error('getRadarPorEstado:', error.message); return []; }
        return data || [];
    },

    // Lista as categorias/temas disponíveis (com palavras-chave) — para o questionário
    listarTemas: async () => {
        const { data, error } = await supabase
            .from('categorias_impacto')
            .select('nome_categoria, palavras_chave')
            .order('nome_categoria', { ascending: true });
        if (error) { console.error('listarTemas:', error.message); return []; }
        return data || [];
    },

    // Votações relacionadas aos temas escolhidos (casa palavras-chave na descrição) — sem IA
    getVotacoesPorTemas: async (temas = [], limite = 8) => {
        if (!temas || temas.length === 0) return [];
        const { data: cats } = await supabase
            .from('categorias_impacto')
            .select('nome_categoria, palavras_chave');
        const kws = [];
        for (const c of cats || []) {
            if (temas.includes(c.nome_categoria)) {
                for (const k of c.palavras_chave || []) kws.push(String(k).toLowerCase());
            }
        }
        if (kws.length === 0) return [];
        const { data } = await supabase
            .from('votos_parlamentares')
            .select('votacao_id_externa, descricao_votacao, aprovacao, data_voto')
            .order('data_voto', { ascending: false })
            .limit(4000);
        const vistos = new Set();
        const out = [];
        for (const v of data || []) {
            if (vistos.has(v.votacao_id_externa)) continue;
            vistos.add(v.votacao_id_externa);
            const d = (v.descricao_votacao || '').toLowerCase();
            if (kws.some((k) => d.includes(k))) {
                out.push(v);
                if (out.length >= limite) break;
            }
        }
        return out;
    },

    // Detalhe de uma votação + todos os votos individuais (página /votacao/[id])
    getVotacao: async (id) => {
        const [votosRes, metaRes] = await Promise.all([
            supabase
                .from('votos_parlamentares')
                .select('voto_tipo, descricao_votacao, aprovacao, data_voto, agentes_politicos!inner(nome_urna, partido_atual, uf_sede, slug, cargo_atual, fonte_api)')
                .eq('votacao_id_externa', id),
            supabase.from('votacoes').select('*').eq('votacao_id_externa', id).maybeSingle(),
        ]);
        const votosData = votosRes.data || [];
        const vm = metaRes.data;
        const base = votosData[0];
        if (!base && !vm) return null;
        const meta = {
            id,
            descricao_votacao: vm?.descricao || base?.descricao_votacao || null,
            aprovacao: (vm?.aprovacao ?? base?.aprovacao) ?? null,
            data_voto: vm?.data_voto || base?.data_voto || null,
            proposicao_titulo: vm?.proposicao_titulo || null,
            ementa: vm?.ementa || null,
            descricao_tipo: vm?.descricao_tipo || null,
            resultado: vm?.resultado || null,
            autor_nome: vm?.autor_nome || null,
            autor_tipo: vm?.autor_tipo || null,
        };
        const votos = votosData
            .map((r) => ({
                voto: r.voto_tipo,
                nome: r.agentes_politicos?.nome_urna,
                partido: r.agentes_politicos?.partido_atual,
                uf: r.agentes_politicos?.uf_sede,
                slug: r.agentes_politicos?.slug,
                // Rota do perfil: numa votacao do Senado a lista e de senadores, e senador
                // nao mora em /deputado/. Ver src/lib/casa.js.
                rota: casaDoPerfil(r.agentes_politicos || {}).rota,
            }))
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        return { meta, votos };
    },

    // Resolve a página de perfil a partir do slug (URL amigável / SEO)
    getPoliticoPorSlug: async (slug) => {
        const { data, error } = await supabase
            .from('agentes_politicos')
            .select('id')
            .eq('slug', slug)
            .single();
        if (error || !data) return null;
        return ServicoAPI.getPoliticoCompleto(data.id);
    },

    // Slug + casa a partir do id (para redirecionar as URLs antigas /politico/[id] ja
    // para a rota certa: /deputado/ ou /senador/).
    perfilBasicoPorId: async (id) => {
        const { data } = await supabase.from('agentes_politicos')
            .select('slug, cargo_atual, fonte_api, casa_legislativa').eq('id', id).single();
        return data || null;
    },

    // Todos os perfis para o sitemap, com o que basta para saber a rota de cada um.
    // Antes de 12/09/2026 esta consulta filtrava por fonte_api ilike '%camara%', entao
    // senadores e deputados estaduais NUNCA entraram no sitemap: o Google so chegava neles
    // por link interno. Agora entram todos, cada um na rota da sua casa.
    // Paginado pelo mesmo motivo do getRadaresPorCasaEAno: o Supabase corta em 1.000 linhas,
    // e a lista cresce a cada assembleia nova.
    listarPerfisParaSitemap: async () => {
        const PAGINA = 1000;
        const todos = [];
        for (let inicio = 0; ; inicio += PAGINA) {
            const { data: pagina, error } = await supabase
                .from('agentes_politicos')
                .select('slug, cargo_atual, fonte_api, casa_legislativa')
                .not('slug', 'is', null)
                .order('slug', { ascending: true })
                .range(inicio, inicio + PAGINA - 1);
            if (error) { console.error('listarPerfisParaSitemap:', error.message); break; }
            todos.push(...(pagina || []));
            if (!pagina || pagina.length < PAGINA) break;
        }
        return todos;
    },

    // ============ PANORAMA FISCAL (SICONFI: União, estados, DF, municípios) ============

    // Resumo + despesa por função de um ente. Município ainda não coletado: busca sob demanda e cacheia.
    getPanoramaEnte: async (codIbge) => {
        const cod = Number(codIbge);
        if (!cod) return null;
        const { data: ente } = await supabase.from('entes_fiscais').select('*').eq('cod_ibge', cod).maybeSingle();
        let { data: resumo } = await supabase.from('fiscal_resumo').select('*').eq('cod_ibge', cod).maybeSingle();
        if (!resumo) {
            try { resumo = await garantirResumo(supabase, cod); } catch (e) { console.error('garantirResumo:', e.message); }
        }
        if (!resumo) return ente ? { ente, resumo: null, funcoes: [] } : null;
        const { data: funcoes } = await supabase.from('fiscal_funcao')
            .select('funcao, valor').eq('cod_ibge', cod).eq('ano', resumo.ano)
            .order('valor', { ascending: false });
        return { ente: ente || null, resumo, funcoes: funcoes || [] };
    },

    getPanoramaUniao: async () => ServicoAPI.getPanoramaEnte(1),

    // Estados + DF com resumo (para o seletor de estado e comparações na home).
    listarEstadosFiscais: async () => {
        const { data } = await supabase.from('fiscal_resumo')
            .select('cod_ibge, receita_total, despesa_total, resultado, populacao, entes_fiscais!inner(ente, uf)')
            .in('esfera', ['E', 'D']);
        const linhas = (data || []).map((d) => ({
            cod_ibge: d.cod_ibge, ente: d.entes_fiscais.ente, uf: d.entes_fiscais.uf,
            receita_total: d.receita_total, despesa_total: d.despesa_total,
            resultado: d.resultado, populacao: d.populacao,
        }));
        linhas.sort((a, b) => a.ente.localeCompare(b.ente, 'pt-BR'));
        return linhas;
    },

    // Ranking de entes por gasto numa função (por habitante ou absoluto).
    getRankingFuncao: async ({ funcao, esferas = ['E', 'D'], porHabitante = true, limite = 10 }) => {
        const { data } = await supabase.from('fiscal_funcao')
            .select('cod_ibge, valor, entes_fiscais!inner(ente, uf, esfera, populacao)')
            .eq('funcao', funcao)
            .in('entes_fiscais.esfera', esferas);
        const linhas = (data || []).map((d) => {
            const e = d.entes_fiscais;
            const pop = e.populacao || null;
            return {
                cod_ibge: d.cod_ibge, ente: e.ente, uf: e.uf, valor: Number(d.valor),
                populacao: pop, por_hab: pop ? Number(d.valor) / pop : null,
            };
        }).filter((l) => (porHabitante ? l.por_hab != null : true));
        linhas.sort((a, b) => (porHabitante ? b.por_hab - a.por_hab : b.valor - a.valor));
        return linhas.slice(0, limite);
    },

    // Busca de entes por nome (autocomplete de município — usada pela rota /api/buscar-ente).
    buscarEntesFiscais: async (termo, limite = 20) => {
        const q = (termo || '').trim();
        if (q.length < 2) return [];
        const { data } = await supabase.from('entes_fiscais')
            .select('cod_ibge, ente, uf, esfera, populacao')
            .ilike('ente', `%${q}%`)
            .order('populacao', { ascending: false, nullsFirst: false })
            .limit(limite);
        return data || [];
    },

    // Todas as despesas por função de estados + DF (para o ranking configurável de /gastos-publicos).
    listarGastosFuncaoEstados: async () => {
        const { data } = await supabase.from('fiscal_funcao')
            .select('cod_ibge, funcao, valor, entes_fiscais!inner(ente, esfera, populacao)')
            .in('entes_fiscais.esfera', ['E', 'D']);
        return (data || []).map((d) => ({
            cod_ibge: d.cod_ibge, funcao: d.funcao, valor: Number(d.valor),
            ente: d.entes_fiscais.ente, populacao: d.entes_fiscais.populacao || null,
        }));
    },

    // ============ PRESIDENCIÁVEIS 2026 (TSE) ============

    // Lista todos os candidatos a Presidente/Vice, agrupados por chapa (nr_candidato).
    // Sem IA: a "proposta" é o link do PDF oficial coletado do TSE (proposta_pdf_url).
    listarPresidenciaveis: async (ano = 2026) => {
        const { data, error } = await supabase
            .from('candidatos_presidenciais')
            .select('id, slug, cargo, nr_candidato, nome_urna, nome_completo, partido_sigla, coligacao_nome, situacao_candidatura, foto_url, proposta_pdf_url')
            .eq('ano_eleicao', ano)
            .order('nr_candidato', { ascending: true });
        if (error) { console.error('listarPresidenciaveis:', error.message); return []; }

        const chapas = new Map();
        for (const c of data || []) {
            const chave = c.nr_candidato || c.id;
            if (!chapas.has(chave)) chapas.set(chave, { nr_candidato: c.nr_candidato, presidente: null, vice: null });
            const chapa = chapas.get(chave);
            if (c.cargo === 'Presidente') chapa.presidente = c; else chapa.vice = c;
        }
        return Array.from(chapas.values())
            .filter((c) => c.presidente) // sem candidato a presidente, não é uma chapa exibível
            .sort((a, b) => Number(a.nr_candidato || 0) - Number(b.nr_candidato || 0));
    },

    // Ficha de um presidenciável pelo slug (URL amigável).
    getPresidenciavelPorSlug: async (slug) => {
        const { data, error } = await supabase
            .from('candidatos_presidenciais')
            .select('*')
            .eq('slug', slug)
            .single();
        if (error || !data) return null;
        // Traz o colega de chapa (presidente↔vice) pra linkar na ficha.
        let colega = null;
        if (data.nr_candidato) {
            const { data: chapaData } = await supabase
                .from('candidatos_presidenciais')
                .select('slug, nome_urna, cargo')
                .eq('ano_eleicao', data.ano_eleicao)
                .eq('nr_candidato', data.nr_candidato)
                .neq('id', data.id);
            colega = chapaData && chapaData[0] ? chapaData[0] : null;
        }
        return { candidato: data, colega };
    },

    // ============ CANDIDATOS A DEPUTADO FEDERAL 2026 (TSE) ============
    // Diferente de Presidenciáveis: não existe "proposta de governo" nesse cargo — só cargos
    // majoritários (Presidente, Governador, Prefeito) são obrigados a apresentar plano de governo
    // no registro de candidatura. Também é por UF: cada deputado concorre num estado só.

    // Total geral + quantos buscam reeleição + contagem por UF — pra montar o seletor de estado
    // (com contagem) e os números do topo da página sem precisar de RPC/view: a tabela só tem
    // ~7,6 mil linhas, então trazer 2 colunas de todo mundo e agrupar aqui é barato.
    // Total nacional + contagem por UF. Usa consultas HEAD (count:'exact', sem baixar linhas) em vez
    // de trazer os registros e contar em JS — o PostgREST limita a resposta padrão a 1000 linhas, e
    // contar em JS a partir de um `.select()` sem `count` batia nesse teto (mostrava sempre "1.000",
    // tanto no total quanto no seletor de estado, mesmo com 7.703 candidatos no banco).
    resumoCandidatosDeputadoFederal: async (ano = 2026) => {
        const { count: total, error: erroTotal } = await supabase
            .from('candidatos_deputado_federal')
            .select('id', { count: 'exact', head: true })
            .eq('ano_eleicao', ano);
        if (erroTotal) { console.error('resumoCandidatosDeputadoFederal (total):', erroTotal.message); return { total: 0, porUf: {} }; }

        const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
        const porUfEntradas = await Promise.all(UFS.map(async (uf) => {
            const { count, error } = await supabase
                .from('candidatos_deputado_federal')
                .select('id', { count: 'exact', head: true })
                .eq('ano_eleicao', ano)
                .eq('uf', uf);
            if (error) { console.error(`resumoCandidatosDeputadoFederal (${uf}):`, error.message); return [uf, 0]; }
            return [uf, count || 0];
        }));

        return { total: total || 0, porUf: Object.fromEntries(porUfEntradas) };
    },

    // Lista paginada de candidatos a Deputado Federal, com filtros (uf, partido, busca por nome,
    // só quem busca reeleição). Ordenado por partido e depois nome, pra navegação previsível.
    listarCandidatosDeputadoFederal: async ({ ano = 2026, uf = null, partido = null, busca = null, reeleicao = false, pagina = 1, porPagina = 24 } = {}) => {
        let q = supabase
            .from('candidatos_deputado_federal')
            .select('id, slug, uf, nr_candidato, nome_urna, partido_sigla, coligacao_nome, situacao_candidatura, reeleicao, foto_url', { count: 'exact' })
            .eq('ano_eleicao', ano);
        if (uf) q = q.eq('uf', uf.toUpperCase());
        if (partido) q = q.eq('partido_sigla', partido.toUpperCase());
        if (reeleicao) q = q.eq('reeleicao', true);
        if (busca && busca.trim()) {
            const termo = busca.trim().replace(/[%,]/g, '');
            q = q.or(`nome_urna.ilike.%${termo}%,nome_completo.ilike.%${termo}%`);
        }
        const paginaSegura = Math.max(1, Number(pagina) || 1);
        const de = (paginaSegura - 1) * porPagina;
        const ate = de + porPagina - 1;
        q = q.order('partido_sigla', { ascending: true }).order('nome_urna', { ascending: true }).range(de, ate);
        const { data, error, count } = await q;
        if (error) { console.error('listarCandidatosDeputadoFederal:', error.message); return { itens: [], total: 0 }; }
        return { itens: data || [], total: count || 0 };
    },

    // Resumo do MANDATO de quem ja e parlamentar, para a ficha de candidato.
    // Deliberadamente leve: só os agregados que a ficha mostra. O perfil completo continua
    // sendo getPoliticoCompleto, que baixa todas as despesas e votos (pesado demais aqui).
    getResumoMandato: async (agenteId) => {
        if (!agenteId) return null;

        const { data: perfil } = await supabase
            .from('agentes_politicos')
            .select('id, slug, nome_urna, partido_atual, uf_sede, fonte_api, cargo_atual, mandato, n_proposicoes, comissoes, cargos_anteriores')
            .eq('id', agenteId)
            .single();
        if (!perfil) return null;

        // Ano de referencia dos gastos: o ultimo ano FECHADO. O ano corrente nao serve de
        // vitrine porque so tem parte do periodo (e, em 2026, a API da Camara esta devolvendo
        // vazio — ver coletor_gastos.js). Se o ano fechado nao tiver nada, cai para o mais
        // recente que tiver, e a tela informa qual ano esta mostrando.
        const anoFechado = new Date().getFullYear() - 1;
        const { data: linhasGasto } = await supabase
            .from('despesas_parlamentares')
            .select('valor_liquido, mes, ano')
            .eq('agente_id', agenteId);

        const porAno = {};
        for (const g of linhasGasto || []) {
            if (!g.ano) continue;
            porAno[g.ano] = porAno[g.ano] || { total: 0, meses: new Set(), n: 0 };
            porAno[g.ano].total += parseFloat(g.valor_liquido || 0);
            porAno[g.ano].n += 1;
            if (g.mes) porAno[g.ano].meses.add(g.mes);
        }
        const anosComDado = Object.keys(porAno).map(Number).sort((a, b) => b - a);
        const anoGasto = porAno[anoFechado] ? anoFechado : (anosComDado[0] ?? null);
        const bloco = anoGasto ? porAno[anoGasto] : null;
        const mesesComGasto = bloco ? bloco.meses.size : 0;

        // Votos: contagem simples por tipo. Só Sim/Não entram no que a tela mostra como
        // "votações em que registrou voto" — ausência não é voto.
        const { data: votos } = await supabase
            .from('votos_parlamentares')
            .select('voto_tipo')
            .eq('agente_id', agenteId);
        const totalVotos = (votos || []).length;
        const contaVoto = (t) => (votos || []).filter((v) => (v.voto_tipo || '').toLowerCase() === t).length;

        let presenca = null;
        try {
            const { data: pres } = await supabase.rpc('presenca_votacoes', { p_agente: agenteId });
            if (pres && pres.total > 0) {
                presenca = { compareceu: pres.compareceu, total: pres.total, percentual: (pres.compareceu / pres.total) * 100 };
            }
        } catch (e) { console.error('presenca_votacoes:', e.message); }

        const comissoes = Array.isArray(perfil.comissoes) ? perfil.comissoes.length : 0;
        const cargosAnteriores = Array.isArray(perfil.cargos_anteriores) ? perfil.cargos_anteriores.length : 0;

        return {
            slug: perfil.slug,
            nome_urna: perfil.nome_urna,
            partido_mandato: perfil.partido_atual || null,
            uf_sede: perfil.uf_sede || null,
            fonte_api: perfil.fonte_api || null,
            cargo_atual: perfil.cargo_atual || null,
            mandato: perfil.mandato || null,
            n_proposicoes: perfil.n_proposicoes ?? null,
            n_comissoes: comissoes,
            n_cargos_anteriores: cargosAnteriores,
            gasto: anoGasto ? {
                ano: anoGasto,
                total: bloco.total,
                n_notas: bloco.n,
                // media mensal sobre os meses QUE TIVERAM gasto, nao sobre 12: nao inventa
                // meses de mandato que talvez nao existam.
                media_mensal: mesesComGasto ? bloco.total / mesesComGasto : null,
                meses_com_gasto: mesesComGasto,
            } : null,
            votos: { total: totalVotos, sim: contaVoto('sim'), nao: contaVoto('não') },
            presenca,
        };
    },

    // Ficha de um candidato a Deputado Federal pelo slug.
    // Quando o candidato JA tem mandato (agente_id preenchido pelo cruzamento nome+UF), a ficha
    // vem com `mandato`: o historico real de quem esta pedindo o voto de novo.
    getCandidatoDeputadoFederalPorSlug: async (slug) => {
        const { data, error } = await supabase
            .from('candidatos_deputado_federal')
            .select('*')
            .eq('slug', slug)
            .single();
        if (error || !data) return null;

        const mandato = data.agente_id ? await ServicoAPI.getResumoMandato(data.agente_id) : null;
        return { ...data, mandato };
    }
};

export default ServicoAPI;
