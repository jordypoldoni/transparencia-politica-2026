-- Mapeamento 1:1 semente -> registro oficial da Câmara
CREATE TEMP TABLE mapa AS
SELECT s.id AS seed_id, c.id AS cam_id
FROM (SELECT id, lower(nome_urna) nu, coalesce(uf_sede,'') uf FROM public.agentes_politicos WHERE fonte_api ILIKE 'Sincroniza%') s
JOIN (SELECT id, lower(nome_urna) nu, coalesce(uf_sede,'') uf FROM public.agentes_politicos WHERE fonte_api ILIKE '%camara%') c
  ON c.nu = s.nu AND c.uf = s.uf
WHERE (SELECT count(*) FROM public.agentes_politicos c2 WHERE c2.fonte_api ILIKE '%camara%' AND lower(c2.nome_urna)=s.nu AND coalesce(c2.uf_sede,'')=s.uf)=1
  AND (SELECT count(*) FROM public.agentes_politicos s2 WHERE s2.fonte_api ILIKE 'Sincroniza%' AND lower(s2.nome_urna)=s.nu AND coalesce(s2.uf_sede,'')=s.uf)=1;

-- Despesas nas sementes são antigas (CSV) e já superadas pelo coletor: apagar
DELETE FROM public.despesas_parlamentares WHERE agente_id IN (SELECT seed_id FROM mapa);

-- Reatribuir quaisquer outros vínculos das sementes para o registro oficial
UPDATE public.votos_parlamentares v SET agente_id = m.cam_id FROM mapa m WHERE v.agente_id = m.seed_id;
UPDATE public.registros_votos r SET agente_id = m.cam_id FROM mapa m WHERE r.agente_id = m.seed_id;
UPDATE public.gastos_cotas_individuais g SET agente_id = m.cam_id FROM mapa m WHERE g.agente_id = m.seed_id;
UPDATE public.processos_judiciarios p SET agente_id = m.cam_id FROM mapa m WHERE p.agente_id = m.seed_id;
UPDATE public.processos_judiciarios p SET politico_envolvido_id = m.cam_id FROM mapa m WHERE p.politico_envolvido_id = m.seed_id;
UPDATE public.legislativo_projetos l SET autor_principal_id = m.cam_id FROM mapa m WHERE l.autor_principal_id = m.seed_id;
UPDATE public.executivo_licitacoes e SET agente_responsavel_id = m.cam_id FROM mapa m WHERE e.agente_responsavel_id = m.seed_id;
UPDATE public.executivo_licitacoes e SET agente_autorizador_id = m.cam_id FROM mapa m WHERE e.agente_autorizador_id = m.seed_id;

-- Remover as sementes duplicadas
DELETE FROM public.agentes_politicos WHERE id IN (SELECT seed_id FROM mapa);

DROP TABLE mapa;
