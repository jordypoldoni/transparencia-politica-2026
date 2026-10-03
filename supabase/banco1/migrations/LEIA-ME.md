# Migrações do banco 1 (dados públicos)

Cópia fiel das 41 migrações registradas em `supabase_migrations.schema_migrations` do projeto `fedxytdorrecllugnicu`, exportadas em 03/10/2026. Cada arquivo é `<versão>_<nome>.sql`, com o conteúdo exato das instruções, conferido por md5 contra o banco.

- A migração `20260614174250_recuperacao_schema_publico` é a base (CREATE TABLE das tabelas originais).
- Serve para recriar o schema do zero e para auditoria. Não é aplicada automaticamente.
- Mudanças novas de schema devem ser versionadas aqui no mesmo padrão ao serem aplicadas.
- Não inclui dados (backup de dados é outro assunto, ver T1b no ESTADO_ATUAL).
