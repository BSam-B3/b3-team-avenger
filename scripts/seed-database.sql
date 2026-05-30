-- Seed quotation templates
INSERT INTO quotation_templates (name, solution_type, base_cost, description)
VALUES
  ('Hardware Refresh', 'upgrade-hardware', 50000, 'CPU + RAM + Disk upgrade'),
  ('Software License Bundle', 'software-license', 15000, 'OS + Microsoft Office 365'),
  ('Network Infrastructure', 'network-setup', 30000, 'Router + Switch + Cabling'),
  ('Backup & Disaster Recovery', 'backup-solution', 25000, 'NAS + Backup Software'),
  ('Security Audit & Hardening', 'security-audit', 20000, 'Vulnerability scan + recommendations'),
  ('Server Consolidation', 'server-consolidation', 75000, 'Virtual server setup'),
  ('Help Desk Support', 'support-contract', 5000, 'Monthly support tier')
ON CONFLICT (name) DO NOTHING;

-- Seed vendor database
INSERT INTO vendor_db (vendor_name, product, unit_cost, lead_time_days)
VALUES
  ('Intel', 'CPU i7-13700K', 10000, 3),
  ('AMD', 'Ryzen 9 7950X', 12000, 3),
  ('Samsung', 'SSD 1TB 990 Pro', 8000, 2),
  ('WD', 'HDD 2TB Blue', 2500, 1),
  ('Cisco', 'Router ISR 4331', 18000, 7),
  ('TP-Link', 'Switch 24-port', 5000, 2),
  ('APC', 'UPS 3000VA', 15000, 5),
  ('Dell', 'Monitor 27\" 4K', 8000, 3)
ON CONFLICT (id) DO NOTHING;

-- Seed checklist templates
INSERT INTO checklist_templates (site_type, items)
VALUES
  (
    'on-site-server',
    '[
      {"name": "CPU Status", "category": "hardware"},
      {"name": "RAM Check", "category": "hardware"},
      {"name": "Disk Space", "category": "storage"},
      {"name": "Network Connectivity", "category": "network"},
      {"name": "Fan Cooling", "category": "hardware"},
      {"name": "Power Supply", "category": "power"},
      {"name": "Temperature", "category": "monitoring"}
    ]'::jsonb
  ),
  (
    'workstation-audit',
    '[
      {"name": "OS Version", "category": "software"},
      {"name": "RAM", "category": "hardware"},
      {"name": "Storage", "category": "storage"},
      {"name": "Antivirus Status", "category": "security"},
      {"name": "Firewall Active", "category": "security"},
      {"name": "Windows Updates", "category": "software"},
      {"name": "Performance", "category": "monitoring"}
    ]'::jsonb
  ),
  (
    'network-check',
    '[
      {"name": "Router Power & Lights", "category": "network"},
      {"name": "Switch Status", "category": "network"},
      {"name": "Network Cables", "category": "network"},
      {"name": "WiFi Signal Strength", "category": "network"},
      {"name": "Internet Speed Test", "category": "network"},
      {"name": "DNS Resolution", "category": "network"},
      {"name": "Gateway Ping", "category": "network"}
    ]'::jsonb
  ),
  (
    'equipment-inventory',
    '[
      {"name": "Count Devices", "category": "inventory"},
      {"name": "Serial Numbers", "category": "inventory"},
      {"name": "Asset Tags", "category": "inventory"},
      {"name": "Condition Assessment", "category": "inventory"},
      {"name": "License Status", "category": "software"},
      {"name": "Warranty Info", "category": "warranty"},
      {"name": "Purchase Date", "category": "inventory"}
    ]'::jsonb
  )
ON CONFLICT (site_type) DO NOTHING;
