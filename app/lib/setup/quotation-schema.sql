-- Quotation System Schema

CREATE TABLE IF NOT EXISTS quotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  solution_type TEXT NOT NULL,
  base_cost DECIMAL(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  product TEXT NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  lead_time_days INT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES quotation_templates(id) ON DELETE RESTRICT,
  salesperson_id TEXT,
  markup_pct DECIMAL(5,2) NOT NULL DEFAULT 25,
  total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
    (SELECT base_cost FROM quotation_templates WHERE id = template_id) *
    (1 + (markup_pct / 100))
  ) STORED,
  status TEXT CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'sent')) DEFAULT 'draft',
  approver_id TEXT,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotation_drafts_customer ON quotation_drafts(customer_id);
CREATE INDEX idx_quotation_drafts_status ON quotation_drafts(status);
