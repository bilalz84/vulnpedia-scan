import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Code, Send, History, Copy, Zap, AlertTriangle } from 'lucide-react';

interface PayloadTesterProps {
  vulnerabilityData?: {
    cve: string;
    title: string;
    location: {
      url: string;
      path: string;
      parameter?: string;
    };
    exploitPayloads: Array<{
      type: string;
      payload: string;
      description: string;
    }>;
  };
}

interface PayloadResult {
  id: string;
  timestamp: string;
  target: string;
  payload: string;
  type: string;
  status: 'success' | 'failed' | 'blocked';
  response: string;
  responseTime: number;
  cve?: string;
}

export const PayloadTester: React.FC<PayloadTesterProps> = ({ vulnerabilityData }) => {
  const { toast } = useToast();
  const [target, setTarget] = useState(vulnerabilityData?.location.url || '');
  const [payloadType, setPayloadType] = useState('');
  const [customPayload, setCustomPayload] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<PayloadResult[]>([]);

  // Set initial values when vulnerability data is provided
  React.useEffect(() => {
    if (vulnerabilityData) {
      setTarget(vulnerabilityData.location.url);
      if (vulnerabilityData.exploitPayloads.length > 0) {
        const firstPayload = vulnerabilityData.exploitPayloads[0];
        setPayloadType(firstPayload.type);
        setCustomPayload(firstPayload.payload);
      }
    }
  }, [vulnerabilityData]);

  const payloadTypes = [
    { value: 'sql-injection', label: 'SQL Injection', example: "' OR '1'='1" },
    { value: 'xss', label: 'Cross-Site Scripting', example: '<script>alert("XSS")</script>' },
    { value: 'command-injection', label: 'Command Injection', example: '; cat /etc/passwd' },
    { value: 'ldap-injection', label: 'LDAP Injection', example: '*)(&))' },
    { value: 'path-traversal', label: 'Path Traversal', example: '../../../etc/passwd' },
    { value: 'custom', label: 'Custom Payload', example: '' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success text-success-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      case 'blocked': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handlePayloadTypeChange = (value: string) => {
    setPayloadType(value);
    const selectedType = payloadTypes.find(type => type.value === value);
    if (selectedType && selectedType.example) {
      setCustomPayload(selectedType.example);
    }
  };

  const executePayload = async () => {
    if (!target || !customPayload) {
      toast({
        title: "Error",
        description: "Please enter both target URL and payload",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);

    // Simulate payload execution
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result: PayloadResult = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      target,
      payload: customPayload,
      type: payloadType,
      status: Math.random() > 0.7 ? 'success' : Math.random() > 0.5 ? 'blocked' : 'failed',
      response: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html>Response content...</html>',
      responseTime: Math.floor(Math.random() * 1000) + 100,
      cve: vulnerabilityData?.cve,
    };

    setResults(prev => [result, ...prev]);

    toast({
      title: "Payload Executed",
      description: `Payload test completed with status: ${result.status}`,
      variant: result.status === 'success' ? 'default' : 'destructive',
    });

    setIsTesting(false);
  };

  const copyPayload = (payload: string) => {
    navigator.clipboard.writeText(payload);
    toast({
      title: "Copied",
      description: "Payload copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Vulnerability Context (if loaded from vulnerability scanner) */}
      {vulnerabilityData && (
        <Card className="bg-gradient-accent border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-foreground">Testing Vulnerability: {vulnerabilityData.cve}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{vulnerabilityData.title}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Target: {vulnerabilityData.location.url}</span>
              <span>Path: {vulnerabilityData.location.path}</span>
              {vulnerabilityData.location.parameter && (
                <span>Parameter: {vulnerabilityData.location.parameter}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vulnerability-Specific Payloads */}
      {vulnerabilityData && vulnerabilityData.exploitPayloads.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Vulnerability-Specific Payloads
            </CardTitle>
            <CardDescription>
              Pre-configured payloads for {vulnerabilityData.cve}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {vulnerabilityData.exploitPayloads.map((payload, idx) => (
                <Card key={idx} className="bg-secondary border-border cursor-pointer hover:shadow-glow transition-all"
                      onClick={() => {
                        setPayloadType(payload.type);
                        setCustomPayload(payload.payload);
                      }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="border-warning text-warning text-xs">
                        {payload.type}
                      </Badge>
                      <Badge variant="outline" className="border-accent text-accent text-xs">
                        {vulnerabilityData.cve}
                      </Badge>
                    </div>
                    <code className="text-xs text-terminal-green font-mono break-all block bg-terminal/20 p-2 rounded mb-2">
                      {payload.payload}
                    </code>
                    <p className="text-xs text-muted-foreground">{payload.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payload Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Payload Configuration
          </CardTitle>
          <CardDescription>
            Configure and test custom payloads against targets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payload-target">Target URL</Label>
              <Input
                id="payload-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="https://example.com/vulnerable-endpoint"
                disabled={isTesting}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payload-type">Payload Type</Label>
              <Select value={payloadType} onValueChange={handlePayloadTypeChange} disabled={isTesting}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select payload type" />
                </SelectTrigger>
                <SelectContent>
                  {payloadTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="custom-payload">Payload</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyPayload(customPayload)}
                disabled={!customPayload}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <Textarea
              id="custom-payload"
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder="Enter your custom payload here..."
              disabled={isTesting}
              className="bg-input border-border font-mono text-sm min-h-[100px]"
            />
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={executePayload} 
              disabled={isTesting || !target || !customPayload}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              {isTesting ? 'Executing...' : 'Execute Payload'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Payloads */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Quick Payloads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {payloadTypes.filter(type => type.example).map((type) => (
              <Card key={type.value} className="bg-secondary border-border cursor-pointer hover:shadow-glow transition-all"
                    onClick={() => {
                      setPayloadType(type.value);
                      setCustomPayload(type.example);
                    }}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="border-accent text-accent text-xs">
                      {type.label}
                    </Badge>
                  </div>
                  <code className="text-xs text-muted-foreground font-mono break-all">
                    {type.example}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-warning" />
            Execution History ({results.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {results.map((result) => (
                <Card key={result.id} className="bg-secondary border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(result.status)}>
                          {result.status.toUpperCase()}
                        </Badge>
                        {result.cve && (
                          <Badge variant="outline" className="border-warning text-warning">
                            {result.cve}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-accent text-accent">
                          {payloadTypes.find(t => t.value === result.type)?.label || result.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{result.responseTime}ms</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Target:</span>
                        <p className="text-sm text-foreground break-all">{result.target}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Payload:</span>
                        <code className="text-xs text-terminal-green font-mono bg-gradient-terminal p-1 rounded block break-all">
                          {result.payload}
                        </code>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Response:</span>
                        <pre className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {result.response}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {results.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No payload executions yet. Execute a payload to see results here.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};