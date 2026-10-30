-- 30/10/2026: índice para o coletor do Senado (CEAPS) apagar o mês sem varrer o ano inteiro.
-- Sem ele, o DELETE ... where casa_legislativa = 'Senado' and ano = 2026 and mes = N varria ~168 mil linhas pelo índice só de ano
-- e estourava o statement_timeout de 8 s da API, então gastos_senado ficou 8 dias parado (Vigia vermelho). Já aplicada no banco 1.
create index if not exists idx_despesas_casa_ano_mes on public.despesas_parlamentares (casa_legislativa, ano, mes);
