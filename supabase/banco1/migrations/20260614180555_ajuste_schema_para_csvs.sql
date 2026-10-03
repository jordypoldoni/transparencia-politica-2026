-- 1) Completar colunas de agentes_politicos para bater com o CSV
ALTER TABLE public.agentes_politicos ADD COLUMN IF NOT EXISTS id_externo_api text;
ALTER TABLE public.agentes_politicos ADD COLUMN IF NOT EXISTS fonte_api text;
ALTER TABLE public.agentes_politicos ADD COLUMN IF NOT EXISTS casa_legislativa text;
ALTER TABLE public.agentes_politicos ADD COLUMN IF NOT EXISTS foto_status text;

-- 2) Remover UNIQUE(nome_urna) para nao travar a importacao (pode haver repetidos/nulos)
ALTER TABLE public.agentes_politicos DROP CONSTRAINT IF EXISTS unique_nome_urna;

-- 3) Criar a tabela que o codigo realmente usa (sem FK por enquanto, para importar liso)
CREATE TABLE IF NOT EXISTS public.despesas_parlamentares (
    id uuid PRIMARY KEY,
    agente_id uuid,
    ano integer,
    mes integer,
    tipo_despesa text,
    categoria_normalizada text,
    fornecedor_nome text,
    fornecedor_cnpj_cpf text,
    valor_liquido numeric(15,2),
    data_emissao date,
    id_externo_documento text,
    url_documento text,
    casa_legislativa text,
    data_insercao timestamptz DEFAULT now()
);

ALTER TABLE public.despesas_parlamentares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura publica" ON public.despesas_parlamentares;
CREATE POLICY "Leitura publica" ON public.despesas_parlamentares FOR SELECT TO anon, authenticated USING (true);
