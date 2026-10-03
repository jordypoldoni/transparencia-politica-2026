
-- Expansão significativa das palavras-chave para cobrir o vocabulário real das ementas
UPDATE categorias_impacto SET palavras_chave = ARRAY[
  'imposto', 'taxa', 'orçament', 'selic', 'banco', 'crédito', 'fiscal',
  'tribut', 'alíquota', 'desonera', 'isent', 'arrecadação',
  'financeiro', 'econôm', 'comércio', 'indústr', 'cooperativa',
  'trabalho', 'emprego', 'salário', 'previdência', 'inss',
  'transport', 'privatiz', 'concessão', 'fundo', 'cargas'
] WHERE nome_categoria = 'Economia e Tributos';

UPDATE categorias_impacto SET palavras_chave = ARRAY[
  'escola', 'ensino', 'professor', 'universidade', 'mec', 'alfabetiz', 'aluno',
  'estudante', 'docente', 'creche', 'graduação', 'educaç',
  'pedagog', 'ciência', 'pesquisa', 'bolsa', 'científ', 'acadêm'
] WHERE nome_categoria = 'Educação';

UPDATE categorias_impacto SET palavras_chave = ARRAY[
  'moradia', 'sfh', 'aluguel', 'imobiliário', 'habitaç', 'urbanismo',
  'assentamento', 'periurbano', 'fundiária', 'saneamento',
  'infraestrutura', 'lote', 'terreno', 'condomínio', 'regularização'
] WHERE nome_categoria = 'Habitação';

UPDATE categorias_impacto SET palavras_chave = ARRAY[
  'clima', 'desmatamento', 'sustentável', 'ibama', 'floresta', 'ecossistema',
  'vegetação', 'bioma', 'atlântica', 'silvestre', 'nativa', 'ambiental',
  'ambiente', 'carbono', 'emissão', 'biodiversidade', 'mineraç', 'mineral',
  'indígena', 'demarcação', 'reflorestamento', 'amazônia', 'cerrado', 'pantanal'
] WHERE nome_categoria = 'Meio Ambiente';

UPDATE categorias_impacto SET palavras_chave = ARRAY[
  'hospital', 'medicamento', 'saúde', 'vacina', 'médico', 'sus', 'clínica',
  'hemoderivado', 'psicolog', 'dependência', 'internaç',
  'farmacêut', 'vigilância sanitária', 'plano de saúde',
  'assistência social', 'droga', 'psicoativ', 'terapêut'
] WHERE nome_categoria = 'Saúde';

UPDATE categorias_impacto SET palavras_chave = ARRAY[
  'polícia', 'armas', 'segurança', 'presídio', 'guarda', 'letalidade', 'crime',
  'tráfico', 'criminal', 'violência', 'pena', 'prisão', 'penal',
  'delegacia', 'facção', 'traficante', 'milícia', 'homicídio'
] WHERE nome_categoria = 'Segurança Pública';

