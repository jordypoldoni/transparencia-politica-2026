-- BANCO 2: REGISTRO DO CONSENTIMENTO PARA A IA LER O TEXTO LIVRE. (26/09/2026)
--
-- Decisão do Jordy em 26/09: o questionário direto é o caminho principal do "Pra você", SEM IA.
-- Escrever no que acredita e deixar a IA sugerir respostas é OPCIONAL, e quando a pessoa escolhe
-- isso, a escolha fica registrada. A LGPD pede que o controlador consiga provar o consentimento
-- (art. 8º, § 2º), e para dado sensível ele tem de ser específico e destacado (art. 11, I).
--
-- O QUE ESTE REGISTRO GUARDA: que houve consentimento, quando, para qual finalidade e com qual
-- versão do texto de aviso na tela. Se a pessoa estiver logada, a conta; se não, nada que a
-- identifique (user_id fica nulo).
-- O QUE NÃO GUARDA: o texto enviado, o endereço de internet, o navegador. Nada disso é preciso para
-- provar o consentimento, e guardar seria criar o dado sensível que a gente decidiu não ter.
--
-- Quem grava é o SERVIDOR (rota da página, com a chave de serviço), no mesmo passo em que manda o
-- texto para a IA: sem o registro gravado, o texto não sai. Ninguém grava isto pelo navegador.
-- Rodar no SQL Editor do banco 2.

create table if not exists public.consentimentos_ia (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  finalidade text not null check (finalidade in ('ia_texto_livre')),
  -- Versão do texto de aviso exibido ao lado da caixa de autorização (definida no código da página).
  versao_aviso text not null check (char_length(versao_aviso) between 4 and 40),
  concedido_em timestamptz not null default now()
);

alter table public.consentimentos_ia enable row level security;
revoke all on public.consentimentos_ia from anon, authenticated;
grant select on public.consentimentos_ia to authenticated;

-- A pessoa logada pode ver os próprios registros (direito de acesso, LGPD art. 18, II).
-- Gravar, só o servidor: não há política de insert para ninguém além da chave de serviço.
drop policy if exists "consentimentos: dono le" on public.consentimentos_ia;
create policy "consentimentos: dono le" on public.consentimentos_ia
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- APAGAR MEUS DADOS não apaga estes registros, de propósito: a pessoa não tem permissão de delete
-- aqui. Quando a CONTA é apagada (no servidor), o "on delete set null" desfaz o vínculo e o registro
-- fica anônimo: continua provando que o consentimento existiu, sem dizer de quem.
