-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Panou Central R&D – Schema Supabase                        ║
-- ║  Mergi la: Supabase → SQL Editor → New query               ║
-- ║  Lipeste tot textul de mai jos si apasa RUN                 ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Tabele pentru hub (index.html) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rd_permissions (
  user_id  text PRIMARY KEY,
  projects jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS rd_order (
  user_id   text PRIMARY KEY,
  order_arr jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS rd_paths (
  project_id  text PRIMARY KEY,
  custom_path text
);

CREATE TABLE IF NOT EXISTS rd_categories (
  project_id text PRIMARY KEY,
  cat        text
);

-- ── Date COMUNE (stante, cilindri – vizibile de toti utilizatorii) ────────────

CREATE TABLE IF NOT EXISTS shared_data (
  key        text PRIMARY KEY,
  value      jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- ── Date PERSONALE (oferte, studii, flux – fiecare user vede doar ale lui) ───

CREATE TABLE IF NOT EXISTS user_data (
  user_id    uuid  NOT NULL,
  key        text  NOT NULL,
  value      jsonb,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE rd_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_order        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_paths        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_data     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data       ENABLE ROW LEVEL SECURITY;

-- Tabele hub: orice utilizator autentificat poate citi/scrie
CREATE POLICY "auth_all" ON rd_permissions  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON rd_order        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON rd_paths        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON rd_categories   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Date comune: orice utilizator autentificat poate citi/scrie
CREATE POLICY "auth_all" ON shared_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Date personale: fiecare user vede si modifica DOAR datele lui
CREATE POLICY "own_select" ON user_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON user_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON user_data FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON user_data FOR DELETE TO authenticated USING (auth.uid() = user_id);
