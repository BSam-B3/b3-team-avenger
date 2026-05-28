-- IT Jarvis On-Site Checklist Schema

CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_type TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onsite_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  site_type TEXT NOT NULL REFERENCES checklist_templates(site_type),
  status TEXT CHECK (status IN ('draft', 'in_progress', 'completed')) DEFAULT 'draft',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES onsite_checklists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  status TEXT CHECK (status IN ('pending', 'done', 'na')) DEFAULT 'pending',
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onsite_checklists_technician ON onsite_checklists(technician_id);
CREATE INDEX idx_onsite_checklists_customer ON onsite_checklists(customer_id);
CREATE INDEX idx_onsite_checklists_status ON onsite_checklists(status);
CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);
