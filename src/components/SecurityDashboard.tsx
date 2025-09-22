import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Target, Code, Globe, Lock } from 'lucide-react';
import { PortScanner } from './PortScanner';
import { VulnerabilityScanner } from './VulnerabilityScanner';
import { PayloadTester } from './PayloadTester';

interface Vulnerability {
  id: string;
  cve: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  exploitAvailable: boolean;
  service: string;
  port: number;
  location: {
    url: string;
    path: string;
    parameter?: string;
    method: string;
  };
  affectedVersions: string[];
  discoveryDetails: {
    timestamp: string;
    confidence: number;
    evidence: string;
  };
  exploitPayloads: Array<{
    type: string;
    payload: string;
    description: string;
  }>;
}

const SecurityDashboard = () => {
  const [activeScans, setActiveScans] = useState(0);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [activeTab, setActiveTab] = useState('port-scanner');

  const handleTestPayload = (vulnerability: Vulnerability) => {
    setSelectedVulnerability(vulnerability);
    setActiveTab('payload-tester');
  };

  const scanModules = [
    {
      id: 'port-scanner',
      title: 'Port Scanner',
      description: 'Discover open ports and running services',
      icon: Globe,
      status: 'ready',
    },
    {
      id: 'vuln-scanner',
      title: 'Vulnerability Scanner',  
      description: 'Check against exploit-db vulnerabilities',
      icon: Shield,
      status: 'ready',
    },
    {
      id: 'payload-tester',
      title: 'Payload Tester',
      description: 'Test custom payloads and exploits',
      icon: Code,
      status: 'ready',
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-lg shadow-glow-primary">
              <Lock className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Security Scanner</h1>
              <p className="text-muted-foreground">Professional penetration testing toolkit</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-primary text-primary">
              <Zap className="h-3 w-3 mr-1" />
              {activeScans} Active Scans
            </Badge>
            <div className="h-2 w-2 bg-success rounded-full animate-pulse-glow"></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scanModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card key={module.id} className="bg-card border-border hover:shadow-glow transition-all duration-300 group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{module.title}</CardTitle>
                  <IconComponent className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{module.description}</p>
                  <div className="flex items-center mt-2">
                    <div className="h-1.5 w-1.5 bg-success rounded-full mr-2"></div>
                    <span className="text-xs text-success capitalize">{module.status}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Scanner Interface */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Scanner Modules
            </CardTitle>
            <CardDescription>
              Select a scanning module to begin security assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="port-scanner" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Port Scanner
                </TabsTrigger>
                <TabsTrigger value="vuln-scanner" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Vulnerability Scanner
                </TabsTrigger>
                <TabsTrigger value="payload-tester" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Payload Tester
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="port-scanner" className="mt-6">
                <PortScanner onScanStart={() => setActiveScans(prev => prev + 1)} onScanEnd={() => setActiveScans(prev => Math.max(0, prev - 1))} />
              </TabsContent>
              
              <TabsContent value="vuln-scanner" className="mt-6">
                <VulnerabilityScanner 
                  onScanStart={() => setActiveScans(prev => prev + 1)} 
                  onScanEnd={() => setActiveScans(prev => Math.max(0, prev - 1))}
                  onTestPayload={handleTestPayload}
                />
              </TabsContent>
              
              <TabsContent value="payload-tester" className="mt-6">
                <PayloadTester 
                  vulnerabilityData={selectedVulnerability ? {
                    cve: selectedVulnerability.cve,
                    title: selectedVulnerability.title,
                    location: selectedVulnerability.location,
                    exploitPayloads: selectedVulnerability.exploitPayloads
                  } : undefined}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityDashboard;