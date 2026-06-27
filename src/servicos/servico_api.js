import supabase from '../supabase_cliente.js';

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
            serie[a] = serie[a] || { total: 0, meses: {} };
            serie[a].total += v;
            if (g.mes) serie[a].meses[g.mes] = (serie[a].meses[g.mes] || 0) + v;
        }
        const anosDisponiveis = Object.keys(serie).map(Number).sort((a, b) => b - a);
        const anoReferencia = anosDisponiveis.includes(2026) ? 2026 : (anosDisponiveis[0] || 2026);
        const serieMensal = anosDisponiveis.map((a) => ({
            ano: a,
            total: serie[a].total,
            meses: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valor: serie[a].meses[i + 1] || 0 })),
            meses_com_gasto: Object.keys(serie[a].meses).length,
        }));

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

        const votos = (votosTodos || []).slice(0, 40);
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
            coerencia
        };
    },

    // Lista todos os deputados federais (para a página /deputados, com busca no cliente)
    listarDeputados: async () => {
        const { data, error } = await supabase
            .from('agentes_politicos')
            .select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, cargo_atual, fonte_api')
            .or('fonte_api.ilike.%camara%,fonte_api.ilike.%senado%,fonte_api.ilike.%alesp%')
            .order('nome_urna', { ascending: true });
        if (error) { console.error('listarDeputados:', error.message); return []; }
        return (data || []).map((d) => {
            const fonte = (d.fonte_api || '').toLowerCase();
            const casa = fonte.includes('senado') ? 'Senado' : fonte.includes('alesp') ? 'Assembleia (SP)' : 'Câmara';
            const cargo = d.cargo_atual || (casa === 'Senado' ? 'Senador(a)' : casa === 'Assembleia (SP)' ? 'Deputado(a) Estadual' : 'Deputado(a) Federal');
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
        // Tabela enriquecida, AGRUPADA por proposta (1 card por assunto, não por sub-voto)
        const { data } = await supabase
            .from('votacoes')
            .select('votacao_id_externa, descricao, aprovacao, data_voto, proposicao_id, proposicao_titulo, ementa, descricao_tipo, resultado, autor_nome')
            .order('data_voto', { ascending: false })
            .limit(150);
        if (data && data.length) {
            const vistos = new Set();
            const out = [];
            for (const v of data) {
                const chave = v.proposicao_id || v.votacao_id_externa;
                if (vistos.has(chave)) continue;
                vistos.add(chave);
                out.push({
                    votacao_id_externa: v.votacao_id_externa,
                    descricao_votacao: v.descricao,
                    aprovacao: v.aprovacao,
                    data_voto: v.data_voto,
                    proposicao_titulo: v.proposicao_titulo,
                    ementa: v.ementa,
                    descricao_tipo: v.descricao_tipo,
                    resultado: v.resultado,
                    autor_nome: v.autor_nome,
                });
                if (out.length >= limite) break;
            }
            return out;
        }
        // Fallback (antes do coletor enriquecer): deriva de votos_parlamentares
        const { data: vd } = await supabase
            .from('votos_parlamentares')
            .select('votacao_id_externa, descricao_votacao, aprovacao, data_voto')
            .order('data_voto', { ascending: false })
            .limit(2000);
        const vistos = new Set();
        const out = [];
        for (const v of vd || []) {
            if (vistos.has(v.votacao_id_externa)) continue;
            vistos.add(v.votacao_id_externa);
            out.push(v);
            if (out.length >= limite) break;
        }
        return out;
    },

    // Todas as votações (para a página de lista, com busca por assunto/autor/data)
    listarVotacoes: async () => {
        const { data, error } = await supabase
            .from('votacoes')
            .select('votacao_id_externa, descricao, aprovacao, data_voto, proposicao_titulo, ementa, descricao_tipo, resultado, autor_nome')
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

    // Ranking de gastos dos deputados de um estado (página /estado/[uf])
    getRadarPorEstado: async (uf, ano = 2026) => {
        const { data, error } = await supabase
            .from('radar_gastos')
            .select('id, slug, nome_urna, partido_atual, uf_sede, foto_url, total, n_notas')
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
                .select('voto_tipo, descricao_votacao, aprovacao, data_voto, agentes_politicos!inner(nome_urna, partido_atual, uf_sede, slug)')
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

    // Slug a partir do id (para redirecionar URLs antigas /politico/[id])
    slugPorId: async (id) => {
        const { data } = await supabase.from('agentes_politicos').select('slug').eq('id', id).single();
        return data?.slug || null;
    },

    // Todos os slugs (para o sitemap)
    listarSlugs: async () => {
        const { data } = await supabase
            .from('agentes_politicos')
            .select('slug')
            .ilike('fonte_api', '%camara%')
            .not('slug', 'is', null);
        return (data || []).map((d) => d.slug);
    }
};

export default ServicoAPI;