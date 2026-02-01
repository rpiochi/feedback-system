-- =============================================
-- Bug Tracker & Feature Voting - Adicional ao projeto existente
-- Execute no SQL Editor: https://supabase.com/dashboard/project/kodvtfvqmnrzwaippayz/sql/new
-- =============================================

-- 1. TABELA DE BUGS
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 4000),
  repro_steps TEXT,
  expected_result TEXT,
  actual_result TEXT,
  module TEXT,
  severity TEXT CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high')),
  environment JSONB,
  page_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'in_progress', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence para gerar public_id (BUG-000001)
CREATE SEQUENCE IF NOT EXISTS bug_public_id_seq START 1;

-- Função para gerar public_id automaticamente
CREATE OR REPLACE FUNCTION generate_bug_public_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.public_id := 'BUG-' || LPAD(nextval('bug_public_id_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bug_public_id ON bugs;
CREATE TRIGGER set_bug_public_id
  BEFORE INSERT ON bugs
  FOR EACH ROW
  EXECUTE FUNCTION generate_bug_public_id();

-- 2. TABELA DE ANEXOS DE BUGS
CREATE TABLE IF NOT EXISTS bug_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_attachments_bug_id ON bug_attachments(bug_id);

-- 3. TABELA DE FEATURE REQUESTS
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in_dev', 'shipped', 'rejected', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE VOTOS
CREATE TABLE IF NOT EXISTS feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  voter_token UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (feature_id, voter_token)
);

CREATE INDEX IF NOT EXISTS idx_feature_votes_feature_id ON feature_votes(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_votes_voter_token ON feature_votes(voter_token);

-- 5. TABELA DE ITENS EM DESENVOLVIMENTO
CREATE TABLE IF NOT EXISTS development_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_development_items_active ON development_items(is_active, order_index);

-- 6. VIEW DE CONTAGEM DE VOTOS
CREATE OR REPLACE VIEW feature_votes_agg AS
SELECT
  feature_id,
  COUNT(*)::INTEGER as votes
FROM feature_votes
GROUP BY feature_id;

-- 7. VIEW PÚBLICA DE FEATURES COM VOTOS
CREATE OR REPLACE VIEW features_with_votes AS
SELECT
  fr.id,
  fr.title,
  fr.description,
  fr.status,
  fr.created_at,
  COALESCE(fva.votes, 0) as votes
FROM feature_requests fr
LEFT JOIN feature_votes_agg fva ON fr.id = fva.feature_id
WHERE fr.status != 'hidden';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_items ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: BUGS
DROP POLICY IF EXISTS "Público pode criar bugs" ON bugs;
CREATE POLICY "Público pode criar bugs" ON bugs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin pode ver bugs" ON bugs;
CREATE POLICY "Admin pode ver bugs" ON bugs
  FOR SELECT TO authenticated
  USING (is_platform_admin());

DROP POLICY IF EXISTS "Admin pode atualizar bugs" ON bugs;
CREATE POLICY "Admin pode atualizar bugs" ON bugs
  FOR UPDATE TO authenticated
  USING (is_platform_admin());

-- POLÍTICAS: BUG_ATTACHMENTS
DROP POLICY IF EXISTS "Público pode criar anexos" ON bug_attachments;
CREATE POLICY "Público pode criar anexos" ON bug_attachments
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM bugs WHERE id = bug_id));

DROP POLICY IF EXISTS "Admin pode ver anexos" ON bug_attachments;
CREATE POLICY "Admin pode ver anexos" ON bug_attachments
  FOR SELECT TO authenticated
  USING (is_platform_admin());

-- POLÍTICAS: FEATURE_REQUESTS
DROP POLICY IF EXISTS "Público pode ver features" ON feature_requests;
CREATE POLICY "Público pode ver features" ON feature_requests
  FOR SELECT TO anon, authenticated
  USING (status != 'hidden');

DROP POLICY IF EXISTS "Público pode criar features" ON feature_requests;
CREATE POLICY "Público pode criar features" ON feature_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin pode atualizar features" ON feature_requests;
CREATE POLICY "Admin pode atualizar features" ON feature_requests
  FOR UPDATE TO authenticated
  USING (is_platform_admin());

DROP POLICY IF EXISTS "Admin pode deletar features" ON feature_requests;
CREATE POLICY "Admin pode deletar features" ON feature_requests
  FOR DELETE TO authenticated
  USING (is_platform_admin());

-- POLÍTICAS: FEATURE_VOTES
DROP POLICY IF EXISTS "Público pode votar" ON feature_votes;
CREATE POLICY "Público pode votar" ON feature_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin pode ver votos" ON feature_votes;
CREATE POLICY "Admin pode ver votos" ON feature_votes
  FOR SELECT TO authenticated
  USING (is_platform_admin());

-- POLÍTICAS: DEVELOPMENT_ITEMS
DROP POLICY IF EXISTS "Público pode ver itens ativos" ON development_items;
CREATE POLICY "Público pode ver itens ativos" ON development_items
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin CRUD development_items" ON development_items;
CREATE POLICY "Admin CRUD development_items" ON development_items
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================
-- STORAGE BUCKET (executar separadamente se necessário)
-- =============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('bug-screenshots', 'bug-screenshots', false)
-- ON CONFLICT (id) DO NOTHING;
