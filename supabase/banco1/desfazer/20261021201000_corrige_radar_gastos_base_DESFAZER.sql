-- Volta a view com o bug (so enquanto radar_gastos_base_antiga existir).
alter materialized view public.radar_gastos_base rename to radar_gastos_base_corrigida;
alter index public.idx_radar_gastos_base_id_ano rename to idx_radar_gastos_base_corrigida_id_ano;
alter materialized view public.radar_gastos_base_antiga rename to radar_gastos_base;
alter index public.idx_radar_gastos_base_antiga_id_ano rename to idx_radar_gastos_base_id_ano;
