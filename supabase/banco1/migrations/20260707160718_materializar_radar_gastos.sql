
-- 1. Dropar a view regular
DROP VIEW IF EXISTS radar_gastos;

-- 2. Criar como materialized view (dados pré-computados)
CREATE MATERIALIZED VIEW radar_gastos AS
SELECT
    a.id,
    a.slug,
    a.nome_urna,
    a.partido_atual,
    a.uf_sede,
    a.foto_url,
    CASE
        WHEN a.fonte_api ILIKE '%senado%'  THEN 'Senado'
        WHEN a.fonte_api ILIKE '%alesp%'   THEN 'Assembleia (SP)'
        ELSE 'Câmara'
    END AS casa,
    d.ano,
    sum(d.valor_liquido) AS total,
    count(*)             AS n_notas
FROM despesas_parlamentares d
JOIN agentes_politicos a ON a.id = d.agente_id
GROUP BY
    a.id, a.slug, a.nome_urna, a.partido_atual, a.uf_sede, a.foto_url,
    CASE
        WHEN a.fonte_api ILIKE '%senado%'  THEN 'Senado'
        WHEN a.fonte_api ILIKE '%alesp%'   THEN 'Assembleia (SP)'
        ELSE 'Câmara'
    END,
    d.ano
WITH DATA;

-- 3. Índice único (obrigatório para REFRESH CONCURRENTLY — não bloqueia leituras)
CREATE UNIQUE INDEX idx_radar_gastos_id_ano
    ON radar_gastos (id, ano);

-- 4. Índices de filtragem/ordenação (queries da home e /estado)
CREATE INDEX idx_radar_gastos_ano_casa
    ON radar_gastos (ano, casa);

CREATE INDEX idx_radar_gastos_total
    ON radar_gastos (total DESC);

CREATE INDEX idx_radar_gastos_uf
    ON radar_gastos (uf_sede, ano);

