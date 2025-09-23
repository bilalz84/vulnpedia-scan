-- Create scans table to track vulnerability scans
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target TEXT NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'vulnerability',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT NOT NULL DEFAULT 'scanner',
  scan_data JSONB DEFAULT '{}',
  total_vulnerabilities INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0
);

-- Create vulnerabilities table to store discovered vulnerabilities
CREATE TABLE public.vulnerabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  cve TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT NOT NULL,
  service_name TEXT NOT NULL,
  port INTEGER NOT NULL,
  exploit_available BOOLEAN NOT NULL DEFAULT false,
  location_url TEXT NOT NULL,
  location_path TEXT NOT NULL,
  location_parameter TEXT,
  location_method TEXT NOT NULL,
  affected_versions TEXT[],
  confidence_score INTEGER NOT NULL DEFAULT 0,
  evidence TEXT,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exploit_payloads JSONB DEFAULT '[]'
);

-- Create payload_tests table to store payload execution results
CREATE TABLE public.payload_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vulnerability_id UUID REFERENCES public.vulnerabilities(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  payload TEXT NOT NULL,
  payload_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked')),
  response_data TEXT,
  response_time INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_by TEXT NOT NULL DEFAULT 'tester'
);

-- Create payload_library table to store external payloads
CREATE TABLE public.payload_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vulnerability_reports table for generated reports
CREATE TABLE public.vulnerability_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  report_title TEXT NOT NULL,
  target TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_vulnerabilities INTEGER NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  report_data JSONB NOT NULL DEFAULT '{}',
  report_format TEXT NOT NULL DEFAULT 'json'
);

-- Create indexes for better performance
CREATE INDEX idx_vulnerabilities_scan_id ON public.vulnerabilities(scan_id);
CREATE INDEX idx_vulnerabilities_cve ON public.vulnerabilities(cve);
CREATE INDEX idx_vulnerabilities_severity ON public.vulnerabilities(severity);
CREATE INDEX idx_payload_tests_vulnerability_id ON public.payload_tests(vulnerability_id);
CREATE INDEX idx_payload_library_type ON public.payload_library(type);
CREATE INDEX idx_scans_target ON public.scans(target);
CREATE INDEX idx_scans_status ON public.scans(status);

-- Create function to update scan statistics
CREATE OR REPLACE FUNCTION public.update_scan_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update scan statistics when vulnerabilities are added/updated/deleted
  UPDATE public.scans 
  SET 
    total_vulnerabilities = (
      SELECT COUNT(*) FROM public.vulnerabilities WHERE scan_id = COALESCE(NEW.scan_id, OLD.scan_id)
    ),
    critical_count = (
      SELECT COUNT(*) FROM public.vulnerabilities WHERE scan_id = COALESCE(NEW.scan_id, OLD.scan_id) AND severity = 'critical'
    ),
    high_count = (
      SELECT COUNT(*) FROM public.vulnerabilities WHERE scan_id = COALESCE(NEW.scan_id, OLD.scan_id) AND severity = 'high'
    ),
    medium_count = (
      SELECT COUNT(*) FROM public.vulnerabilities WHERE scan_id = COALESCE(NEW.scan_id, OLD.scan_id) AND severity = 'medium'
    ),
    low_count = (
      SELECT COUNT(*) FROM public.vulnerabilities WHERE scan_id = COALESCE(NEW.scan_id, OLD.scan_id) AND severity = 'low'
    )
  WHERE id = COALESCE(NEW.scan_id, OLD.scan_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update scan statistics
CREATE TRIGGER update_scan_stats_on_vulnerability_change
  AFTER INSERT OR UPDATE OR DELETE ON public.vulnerabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_scan_statistics();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for payload_library updated_at
CREATE TRIGGER update_payload_library_updated_at
  BEFORE UPDATE ON public.payload_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payload_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_reports ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (since this is a security tool demo)
-- In production, these should be restricted based on user authentication
CREATE POLICY "Allow all operations on scans" ON public.scans FOR ALL USING (true);
CREATE POLICY "Allow all operations on vulnerabilities" ON public.vulnerabilities FOR ALL USING (true);
CREATE POLICY "Allow all operations on payload_tests" ON public.payload_tests FOR ALL USING (true);
CREATE POLICY "Allow all operations on payload_library" ON public.payload_library FOR ALL USING (true);
CREATE POLICY "Allow all operations on vulnerability_reports" ON public.vulnerability_reports FOR ALL USING (true);

-- Insert some sample payload library entries
INSERT INTO public.payload_library (name, type, payload, description, source, category) VALUES
('Basic SQL Injection', 'sql-injection', ''' OR ''1''=''1', 'Basic SQL injection to bypass authentication', 'OWASP', 'authentication'),
('Union SQL Injection', 'sql-injection', ''' UNION SELECT null,version(),null--', 'Extract database version information', 'OWASP', 'information-disclosure'),
('XSS Basic Alert', 'xss', '<script>alert("XSS")</script>', 'Basic cross-site scripting payload', 'OWASP', 'client-side'),
('XSS Image Onerror', 'xss', '<img src=x onerror=alert("XSS")>', 'XSS via image onerror event', 'PortSwigger', 'client-side'),
('Command Injection Linux', 'command-injection', '; cat /etc/passwd', 'Read system password file on Linux', 'OWASP', 'server-side'),
('Command Injection Windows', 'command-injection', '& type C:\Windows\System32\drivers\etc\hosts', 'Read hosts file on Windows', 'OWASP', 'server-side'),
('Path Traversal Linux', 'path-traversal', '../../../etc/passwd', 'Access system files via path traversal', 'OWASP', 'server-side'),
('Path Traversal Windows', 'path-traversal', '..\..\..\Windows\System32\drivers\etc\hosts', 'Access system files on Windows', 'OWASP', 'server-side'),
('LDAP Injection', 'ldap-injection', '*)(&))', 'Bypass LDAP authentication', 'OWASP', 'authentication'),
('XXE Basic', 'xxe', '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>', 'XML External Entity injection', 'OWASP', 'server-side');