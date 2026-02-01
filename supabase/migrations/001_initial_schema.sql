-- =============================================
-- Bug Tracker & Feature Voting - Initial Schema
-- =============================================

-- 1. TABELA DE ADMINS
CREATE TABLE admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE BUGS
CREATE TABLE bugs (
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
CREATE SEQUENCE bug_public_id_seq START 1;

-- Função para gerar public_id automaticamente
CREATE OR REPLACE FUNCTION generate_bug_public_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.public_id := 'BUG-' || LPAD(nextval('bug_public_id_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bug_public_id
  BEFORE INSERT ON bugs
  FOR EACH ROW
  EXECUTE FUNCTION generate_bug_public_id();

-- 3. TABELA DE ANEXOS DE BUGS
CREATE TABLE bug_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bug_attachments_bug_id ON bug_attachments(bug_id);

-- 4. TABELA DE FEATURE REQUESTS
CREATE TABLE feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 2000),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in_dev', 'shipped', 'rejected', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE VOTOS
CREATE TABLE feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  voter_token UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (feature_id, voter_token)
);

CREATE INDEX idx_feature_votes_feature_id ON feature_votes(feature_id);
CREATE INDEX idx_feature_votes_voter_token ON feature_votes(voter_token);

-- 6. TABELA DE ITENS EM DESENVOLVIMENTO
CREATE TABLE development_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_development_items_active ON development_items(is_active, order_index);

-- 7. VIEW DE CONTAGEM DE VOTOS
CREATE VIEW feature_votes_agg AS
SELECT
  feature_id,
  COUNT(*)::INTEGER as votes
FROM feature_votes
GROUP BY feature_id;

-- 8. VIEW PÚBLICA DE FEATURES COM VOTOS
CREATE VIEW features_with_votes AS
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

-- Habilitar RLS em todas as tabelas
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar se é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICAS: BUGS
-- Público pode criar bugs
CREATE POLICY "Público pode criar bugs" ON bugs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Apenas admin pode ver bugs
CREATE POLICY "Admin pode ver bugs" ON bugs
  FOR SELECT TO authenticated
  USING (is_admin());

-- Admin pode atualizar bugs
CREATE POLICY "Admin pode atualizar bugs" ON bugs
  FOR UPDATE TO authenticated
  USING (is_admin());

-- POLÍTICAS: BUG_ATTACHMENTS
-- Público pode criar anexos (vinculados a um bug existente)
CREATE POLICY "Público pode criar anexos" ON bug_attachments
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM bugs WHERE id = bug_id)
  );

-- Apenas admin pode ver anexos
CREATE POLICY "Admin pode ver anexos" ON bug_attachments
  FOR SELECT TO authenticated
  USING (is_admin());

-- POLÍTICAS: FEATURE_REQUESTS
-- Público pode ver features não ocultas
CREATE POLICY "Público pode ver features" ON feature_requests
  FOR SELECT TO anon, authenticated
  USING (status != 'hidden');

-- Público pode criar features
CREATE POLICY "Público pode criar features" ON feature_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admin pode atualizar features
CREATE POLICY "Admin pode atualizar features" ON feature_requests
  FOR UPDATE TO authenticated
  USING (is_admin());

-- Admin pode deletar features
CREATE POLICY "Admin pode deletar features" ON feature_requests
  FOR DELETE TO authenticated
  USING (is_admin());

-- POLÍTICAS: FEATURE_VOTES
-- Público pode votar
CREATE POLICY "Público pode votar" ON feature_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admin pode ver votos
CREATE POLICY "Admin pode ver votos" ON feature_votes
  FOR SELECT TO authenticated
  USING (is_admin());

-- POLÍTICAS: DEVELOPMENT_ITEMS
-- Público pode ver itens ativos
CREATE POLICY "Público pode ver itens ativos" ON development_items
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admin tem acesso total
CREATE POLICY "Admin CRUD development_items" ON development_items
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- POLÍTICAS: ADMINS
-- Apenas admins podem ver a tabela de admins
CREATE POLICY "Admin pode ver admins" ON admins
  FOR SELECT TO authenticated
  USING (is_admin());

-- =============================================
-- STORAGE BUCKET
-- =============================================
-- Executar no Supabase Dashboard ou via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('bug-screenshots', 'bug-screenshots', false);
