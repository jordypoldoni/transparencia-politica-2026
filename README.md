# Lume Cidadão

Hub de transparência política: gastos, votos e candidaturas de parlamentares e candidatos, em linguagem clara, sempre com fonte oficial e sem julgamento (só fato + fonte).

Site: https://www.lumecidadao.com.br

## Stack

Next.js 14 (pages router) e React 18, Supabase (Postgres, dois projetos: dados públicos e dados de pessoa), deploy na Vercel, coletores em Node e agendamento por GitHub Actions.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `pages/` | Páginas e rotas `pages/api/` |
| `components/` | Componentes de interface reutilizáveis |
| `src/lib/` | Lógica compartilhada (paginação, datas, apuração, afinidade, favoritos...) |
| `src/servicos/` | Acesso aos dados (`servico_api.js`) |
| `src/estilo/` | Tokens de design e estilos de botão |
| `coletores/` | Coletores de dados, sondas (`_sonda_*`) e migrações SQL antigas |
| `supabase/` | SQL de esquema (`banco1`, `banco2`) e a função `tse-ponte` |
| `.github/workflows/` | Coleta diária e semanal |
| `public/` | Ícones, manifesto, `robots.txt` e imagem de compartilhamento |

## Rodar localmente

```
npm install
npm run dev
```

Variáveis de ambiente (arquivo `.env`, nunca versionado). Só os nomes:

- Banco 1 (dados públicos): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Banco 2 (dados de pessoa): `SUPABASE_URL_2`, `SUPABASE_SERVICE_ROLE_KEY_2`, `NEXT_PUBLIC_SUPABASE_URL_2`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_2`
- IA dos coletores de resumo: `GROK_API_KEY` (guarda a chave da Groq), `GEMINI_API_KEY`
- Ponte do TSE: `TSE_PONTE_URL`, `PONTE_TOKEN`

## Coletores

Cada arquivo em `coletores/` roda com `node coletores/<arquivo>.js` e lê o `.env`. Os agendados estão em `.github/workflows/coletar.yml` e `coletar_fiscal.yml`. Arquivos com prefixo `_` são sondas e diagnósticos, não fazem parte da rotina.

## Princípios

Neutralidade radical (só fato + fonte), todo dado diz sobre o que é, e o que não foi coletado aparece dizendo que falta. Dados de pessoa ficam isolados dos dados públicos.
