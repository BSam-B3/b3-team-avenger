CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  error TEXT NOT NULL,
  stack TEXT,
  user_id TEXT,
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_error_endpoint_time ON error_logs(endpoint, timestamp DESC);
CREATE INDEX idx_error_severity ON error_logs(severity);
