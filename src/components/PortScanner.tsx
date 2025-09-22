import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, Wifi, Terminal, AlertCircle } from 'lucide-react';

interface PortScannerProps {
  onScanStart: () => void;
  onScanEnd: () => void;
}

interface ScanResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service: string;
  version: string;
  timestamp: string;
}

export const PortScanner: React.FC<PortScannerProps> = ({ onScanStart, onScanEnd }) => {
  const { toast } = useToast();
  const [target, setTarget] = useState('');
  const [portRange, setPortRange] = useState('1-1000');
  const [verboseMode, setVerboseMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanOutput, setScanOutput] = useState<string[]>([]);

  const mockServices = [
    { port: 22, service: 'SSH', version: 'OpenSSH 8.2p1' },
    { port: 80, service: 'HTTP', version: 'Apache/2.4.41' },
    { port: 443, service: 'HTTPS', version: 'Apache/2.4.41' },
    { port: 3306, service: 'MySQL', version: '8.0.25' },
    { port: 5432, service: 'PostgreSQL', version: '13.3' },
  ];

  const simulateScan = async () => {
    if (!target) {
      toast({
        title: "Error",
        description: "Please enter a target IP or hostname",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setProgress(0);
    setResults([]);
    setScanOutput([]);
    onScanStart();

    // Add initial scan output
    setScanOutput(prev => [...prev, `Starting port scan on ${target}...`, `Port range: ${portRange}`, '']);

    const [startPort, endPort] = portRange.split('-').map(Number);
    const totalPorts = endPort - startPort + 1;
    let scannedPorts = 0;

    for (let port = startPort; port <= Math.min(endPort, startPort + 50); port += 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate finding some open ports
      const mockService = mockServices.find(s => s.port === port);
      if (mockService || Math.random() > 0.95) {
        const service = mockService || { port, service: 'Unknown', version: 'N/A' };
        const result: ScanResult = {
          port: service.port,
          status: 'open',
          service: service.service,
          version: service.version,
          timestamp: new Date().toLocaleTimeString(),
        };
        
        setResults(prev => [...prev, result]);
        
        if (verboseMode) {
          setScanOutput(prev => [...prev, 
            `[${result.timestamp}] Port ${result.port}/tcp open ${result.service} ${result.version}`
          ]);
        }
      }
      
      scannedPorts += 5;
      setProgress((scannedPorts / totalPorts) * 100);
    }

    setScanOutput(prev => [...prev, '', `Scan completed. Found ${results.length} open ports.`]);
    
    toast({
      title: "Scan Complete",
      description: `Found ${results.length} open ports on ${target}`,
    });

    setIsScanning(false);
    onScanEnd();
  };

  const stopScan = () => {
    setIsScanning(false);
    setScanOutput(prev => [...prev, '', 'Scan stopped by user.']);
    onScanEnd();
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Port Scanner Configuration
          </CardTitle>
          <CardDescription>
            Configure target and scanning parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target (IP/Hostname)</Label>
              <Input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="192.168.1.1 or example.com"
                disabled={isScanning}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ports">Port Range</Label>
              <Input
                id="ports"
                value={portRange}
                onChange={(e) => setPortRange(e.target.value)}
                placeholder="1-1000 or 80,443,22"
                disabled={isScanning}
                className="bg-input border-border"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="verbose"
                checked={verboseMode}
                onCheckedChange={setVerboseMode}
                disabled={isScanning}
              />
              <Label htmlFor="verbose">Verbose Mode</Label>
            </div>
            
            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={simulateScan} className="bg-primary hover:bg-primary/90">
                  <Play className="h-4 w-4 mr-2" />
                  Start Scan
                </Button>
              ) : (
                <Button onClick={stopScan} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Scan
                </Button>
              )}
            </div>
          </div>
          
          {isScanning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Scanning progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Open Ports ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded border-border border">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-success text-success">
                        {result.port}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{result.service}</div>
                        <div className="text-xs text-muted-foreground">{result.version}</div>
                      </div>
                    </div>
                    <Badge className="bg-success text-success-foreground">
                      {result.status}
                    </Badge>
                  </div>
                ))}
                {results.length === 0 && !isScanning && (
                  <div className="text-center text-muted-foreground py-8">
                    No open ports found. Start a scan to see results.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Terminal Output */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-terminal-green" />
              Scan Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="bg-gradient-terminal p-4 rounded font-mono text-sm space-y-1">
                {scanOutput.map((line, index) => (
                  <div key={index} className="text-terminal-green">
                    {line || <br />}
                  </div>
                ))}
                {isScanning && (
                  <div className="text-terminal-green flex items-center">
                    Scanning<span className="animate-terminal-blink ml-1">_</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};