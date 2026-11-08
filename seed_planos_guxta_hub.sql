-- GUXTA HUB · Ofertas comerciais (planos, projetos e adicionais)
-- Rodar UMA vez no SQL Editor do Supabase, depois do arquivo 23 (estrutura das tabelas planos e planos_itens).
-- Os itens são compartilhados por todos os planos: em cada plano, o item aparece com "true" (incluso),
-- "false" (não incluso), texto (quantidade) ou fica de fora (não mostrado).
-- Para apagar e refazer: DELETE FROM planos; DELETE FROM planos_itens;

BEGIN;

CREATE TEMP TABLE _it (id uuid, nome text) ON COMMIT DROP;

WITH ins AS (
  INSERT INTO planos_itens (nome, ordem) VALUES
    ('Conteúdos para redes sociais', 1),
    ('Planejamento estratégico mensal de marketing', 2),
    ('Planejamento mensal de conteúdo', 3),
    ('Calendário editorial', 4),
    ('Criação de artes e textos', 5),
    ('Legendas e chamadas para ação', 6),
    ('Roteiros para vídeos', 7),
    ('Planejamento de campanhas comerciais', 8),
    ('Agendamento das publicações', 9),
    ('Acompanhamento de indicadores básicos', 10),
    ('Reunião mensal de acompanhamento', 11),
    ('Gestão das demandas pela plataforma GUXTA HUB', 12),
    ('Gravação ou edição de vídeos', 13),
    ('Gestão de anúncios', 14),
    ('Atendimento de mensagens', 15),
    ('Diagnóstico e briefing da marca', 16),
    ('Direcionamento de posicionamento', 17),
    ('Identidade visual (criação)', 18),
    ('Paleta de cores e tipografia', 19),
    ('Elementos gráficos', 20),
    ('Manual básico de identidade', 21),
    ('Aplicações visuais selecionadas', 22),
    ('Briefing e objetivos da campanha', 23),
    ('Conceito criativo', 24),
    ('Planejamento da campanha', 25),
    ('Peças gráficas da campanha', 26),
    ('Textos e chamadas para ação da campanha', 27),
    ('Cronograma de execução', 28),
    ('Vídeos da campanha', 29),
    ('Landing page', 30),
    ('Site institucional', 31),
    ('Página ou estrutura personalizada', 32)
  RETURNING id, nome
)
INSERT INTO _it SELECT id, nome FROM ins;

-- 1. PLANOS MENSAIS ---------------------------------------------------------

INSERT INTO planos (nome, descricao, preco, periodo, obs, destaque, ativo, valores, ordem, atualizado_em)
SELECT 'HUB Presença',
  'Para negócios que precisam manter uma presença digital profissional e organizada.',
  1200, 'mês',
  'Fidelidade mínima de 3 meses. Pagamento mensal antecipado. Uma rodada de ajustes por conteúdo. Atendimento de mensagens sob orçamento.',
  false, true,
  (SELECT jsonb_object_agg(i.id::text, v.val) FROM _it i JOIN (VALUES
    ('Conteúdos para redes sociais', '"8"'::jsonb),
    ('Planejamento mensal de conteúdo', 'true'::jsonb),
    ('Calendário editorial', 'true'::jsonb),
    ('Criação de artes e textos', 'true'::jsonb),
    ('Legendas e chamadas para ação', 'true'::jsonb),
    ('Agendamento das publicações', 'true'::jsonb),
    ('Gestão das demandas pela plataforma GUXTA HUB', 'true'::jsonb),
    ('Reunião mensal de acompanhamento', '"1 por mês"'::jsonb),
    ('Gravação ou edição de vídeos', 'false'::jsonb),
    ('Gestão de anúncios', 'false'::jsonb),
    ('Atendimento de mensagens', 'false'::jsonb)
  ) v(nome, val) ON v.nome = i.nome),
  1, now();

INSERT INTO planos (nome, descricao, preco, periodo, obs, destaque, ativo, valores, ordem, atualizado_em)
SELECT 'HUB Crescimento',
  'Para empresas que precisam conectar planejamento, conteúdo e campanhas.',
  1900, 'mês',
  'Os 12 conteúdos são o total mensal (vídeos entram como adicional). Fidelidade mínima de 3 meses. Pagamento mensal antecipado. Uma rodada de ajustes por conteúdo. Verba de anúncios paga direto pelo cliente às plataformas.',
  true, true,
  (SELECT jsonb_object_agg(i.id::text, v.val) FROM _it i JOIN (VALUES
    ('Conteúdos para redes sociais', '"12"'::jsonb),
    ('Planejamento estratégico mensal de marketing', 'true'::jsonb),
    ('Calendário editorial', 'true'::jsonb),
    ('Criação de artes e textos', 'true'::jsonb),
    ('Roteiros para vídeos', 'true'::jsonb),
    ('Planejamento de campanhas comerciais', 'true'::jsonb),
    ('Agendamento das publicações', 'true'::jsonb),
    ('Acompanhamento de indicadores básicos', 'true'::jsonb),
    ('Reunião mensal de acompanhamento', '"1 por mês (análise e direcionamento)"'::jsonb),
    ('Gestão das demandas pela plataforma GUXTA HUB', 'true'::jsonb),
    ('Gravação ou edição de vídeos', 'false'::jsonb),
    ('Gestão de anúncios', 'false'::jsonb),
    ('Atendimento de mensagens', 'false'::jsonb)
  ) v(nome, val) ON v.nome = i.nome),
  2, now();

-- 2. PROJETOS AVULSOS (preço = valor inicial da faixa) -----------------------

INSERT INTO planos (nome, descricao, preco, periodo, obs, destaque, ativo, valores, ordem, atualizado_em)
SELECT 'HUB Marca',
  'Identidade visual e construção de marca.',
  1800, 'projeto',
  'Faixa de R$ 1.800 a R$ 3.000. Valor inicial de referência; o orçamento final considera complexidade, prazo, horas de trabalho e revisões.',
  false, true,
  (SELECT jsonb_object_agg(i.id::text, v.val) FROM _it i JOIN (VALUES
    ('Diagnóstico e briefing da marca', 'true'::jsonb),
    ('Direcionamento de posicionamento', 'true'::jsonb),
    ('Identidade visual (criação)', 'true'::jsonb),
    ('Paleta de cores e tipografia', 'true'::jsonb),
    ('Elementos gráficos', 'true'::jsonb),
    ('Manual básico de identidade', 'true'::jsonb),
    ('Aplicações visuais selecionadas', 'true'::jsonb)
  ) v(nome, val) ON v.nome = i.nome),
  3, now();

INSERT INTO planos (nome, descricao, preco, periodo, obs, destaque, ativo, valores, ordem, atualizado_em)
SELECT 'HUB Campanha',
  'Planejamento e criação de campanhas comerciais.',
  1500, 'campanha',
  'Faixa de R$ 1.500 a R$ 2.800. Valor inicial de referência; o orçamento final considera complexidade, prazo, horas de trabalho e revisões.',
  false, true,
  (SELECT jsonb_object_agg(i.id::text, v.val) FROM _it i JOIN (VALUES
    ('Briefing e objetivos da campanha', 'true'::jsonb),
    ('Conceito criativo', 'true'::jsonb),
    ('Planejamento da campanha', 'true'::jsonb),
    ('Peças gráficas da campanha', '"até 6"'::jsonb),
    ('Textos e chamadas para ação da campanha', 'true'::jsonb),
    ('Cronograma de execução', 'true'::jsonb),
    ('Vídeos da campanha', '"até 2, se contratados como adicional"'::jsonb)
  ) v(nome, val) ON v.nome = i.nome),
  4, now();

INSERT INTO planos (nome, descricao, preco, periodo, obs, destaque, ativo, valores, ordem, atualizado_em)
SELECT 'HUB Digital',
  'Projetos digitais sob demanda.',
  900, 'projeto',
  'Site institucional a partir de R$ 1.800. Página ou estrutura personalizada sob orçamento.',
  false, true,
  (SELECT jsonb_object_agg(i.id::text, v.val) FROM _it i JOIN (VALUES
    ('Landing page', '"a partir de R$ 900"'::jsonb),
    ('Site institucional', '"a partir de R$ 1.800"'::jsonb),
    ('Página ou estrutura personalizada', '"sob orçamento"'::jsonb)
  ) v(nome, val) ON v.nome = i.nome),
  5, now();

-- 3. ADICIONAIS (ocultos na página pública; ficam disponíveis no painel para orçar) ---

INSERT INTO planos (nome, descricao, preco, periodo, obs, destaque, ativo, valores, ordem, atualizado_em) VALUES
  ('Adicional · Edição de vídeo curto', 'Cliente envia o material.', 150, 'vídeo',
   'Vídeos incluem edição de material fornecido pelo cliente, salvo contratação de captação.', false, false, '{}'::jsonb, 10, now()),
  ('Adicional · Pacote com 4 vídeos editados', 'Pacote de edição de vídeos.', 500, 'pacote',
   'Cliente envia o material.', false, false, '{}'::jsonb, 11, now()),
  ('Adicional · Captação presencial de vídeos', 'Gravação no local.', 350, 'diária',
   'A partir de. Depende de localização, duração e deslocamento.', false, false, '{}'::jsonb, 12, now()),
  ('Adicional · Gestão de tráfego pago', 'Gestão de campanhas nas plataformas.', 700, 'mês',
   'A partir de. Verba de anúncios paga diretamente pelo cliente às plataformas. Cobrado separadamente.', false, false, '{}'::jsonb, 13, now()),
  ('Adicional · Planejamento de campanha avulsa', 'Planejamento de campanha sem acompanhamento mensal.', 700, 'projeto',
   'A partir de.', false, false, '{}'::jsonb, 14, now());

COMMIT;
