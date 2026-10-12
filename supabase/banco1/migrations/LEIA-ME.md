# Migrações do banco 1 (dados públicos)

Cópia das migrações registradas em `supabase_migrations.schema_migrations` do projeto `fedxytdorrecllugnicu` (41 exportadas em 03/10/2026, conferidas por md5 contra o banco), mais as aplicadas depois (ex.: `20261011150000_t2b_seguranca_banco1.sql`, `20261012145500_t2_revoke_escrita_publico.sql`). Cada arquivo é `<versão>_<nome>.sql`.

- A migração `20260614174250_recuperacao_schema_publico` é a base (CREATE TABLE das tabelas originais).
- Serve para auditoria e como referência do schema. Não é aplicada automaticamente.
- **Atenção: estas migrações SOZINHAS não recriam o schema do zero.** Algumas tabelas e colunas foram criadas fora do histórico, por SQL avulso. Para recriar (foi testado em réplica local em 12/10/2026), aplicar, na ordem:
  1. as migrações anteriores a `20260907213453`;
  2. `coletores/migracao_candidatos_deputado_federal_2026.sql` e `coletores/migracao_presidenciaveis_2026.sql`, (que precisam existir antes de `20260907213453_candidatos_depfed_agente_id` e `20260918153301_ficha_tse_presidenciaveis`);
  3. o restante das migrações, e depois: `supabase/banco1/006_candidaturas_duplicadas.sql`, `coletores/migracao_resumo_propostas_2026.sql`, `coletores/migracao_refresh_radar_timeout.sql`, `coletores/migracao_candidatos_senador_agente_id.sql`.
  (Conferir a ordem exata contra o banco antes de depender disso numa recuperação real.)
- Scripts para desfazer uma mudança ficam em `supabase/banco1/desfazer/` (não fazem parte do histórico).
- Mudanças novas de schema devem ser versionadas aqui no mesmo padrão ao serem aplicadas.
- Não inclui dados (backup de dados é outro assunto, ver T1b no ESTADO_ATUAL; adiado, D-023).
