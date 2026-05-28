-- Mobile Voice Command Schema

CREATE TABLE IF NOT EXISTS voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  transcript TEXT NOT NULL,
  intent TEXT,
  action TEXT,
  parameters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES voice_commands(id) ON DELETE CASCADE,
  action_taken TEXT,
  result JSONB,
  status TEXT CHECK (status IN ('success', 'failed', 'pending', 'confirmed')) DEFAULT 'pending',
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_commands_user ON voice_commands(user_id);
CREATE INDEX idx_voice_commands_intent ON voice_commands(intent);
CREATE INDEX idx_voice_results_status ON voice_results(status);
