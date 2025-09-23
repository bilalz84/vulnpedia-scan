import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { scanId, format = 'json', authorizedBy = 'Security Analyst' } = await req.json();

    if (!scanId) {
      return new Response(JSON.stringify({ error: 'Scan ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating vulnerability report for scan: ${scanId}`);

    // Get scan details
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (scanError || !scanData) {
      return new Response(JSON.stringify({ error: 'Scan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get vulnerabilities for this scan
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('scan_id', scanId)
      .order('severity', { ascending: false });

    if (vulnError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch vulnerabilities' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get payload test results
    const { data: payloadTests } = await supabase
      .from('payload_tests')
      .select(`
        *,
        vulnerabilities!payload_tests_vulnerability_id_fkey (
          cve,
          title,
          severity
        )
      `)
      .in('vulnerability_id', vulnerabilities?.map(v => v.id) || [])
      .order('executed_at', { ascending: false });

    // Generate report
    const report = await generateReport(scanData, vulnerabilities || [], payloadTests || [], authorizedBy, format);

    // Store report in database
    const { data: reportRecord, error: reportError } = await supabase
      .from('vulnerability_reports')
      .insert({
        scan_id: scanId,
        report_title: `Vulnerability Assessment Report - ${scanData.target}`,
        target: scanData.target,
        generated_by: authorizedBy,
        scan_date: scanData.started_at,
        total_vulnerabilities: scanData.total_vulnerabilities || 0,
        critical_count: scanData.critical_count || 0,
        high_count: scanData.high_count || 0,
        medium_count: scanData.medium_count || 0,
        low_count: scanData.low_count || 0,
        report_data: report,
        report_format: format
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error storing report:', reportError);
    }

    return new Response(JSON.stringify({
      reportId: reportRecord?.id,
      report: report,
      metadata: {
        scanId: scanId,
        target: scanData.target,
        generatedBy: authorizedBy,
        generatedAt: new Date().toISOString(),
        format: format
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-report function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateReport(scanData: any, vulnerabilities: any[], payloadTests: any[], authorizedBy: string, format: string) {
  const reportData = {
    title: `Vulnerability Assessment Report - ${scanData.target}`,
    executiveSummary: generateExecutiveSummary(scanData, vulnerabilities),
    scanDetails: {
      target: scanData.target,
      scanType: scanData.scan_type,
      startTime: scanData.started_at,
      endTime: scanData.completed_at,
      duration: calculateDuration(scanData.started_at, scanData.completed_at),
      authorizedBy: authorizedBy,
      generatedAt: new Date().toISOString()
    },
    statistics: {
      totalVulnerabilities: vulnerabilities.length,
      criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
      highCount: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowCount: vulnerabilities.filter(v => v.severity === 'low').length
    },
    vulnerabilities: vulnerabilities.map(vuln => ({
      cve: vuln.cve,
      title: vuln.title,
      severity: vuln.severity,
      description: vuln.description,
      service: vuln.service_name,
      port: vuln.port,
      location: {
        url: vuln.location_url,
        path: vuln.location_path,
        parameter: vuln.location_parameter,
        method: vuln.location_method
      },
      exploitAvailable: vuln.exploit_available,
      confidenceScore: vuln.confidence_score,
      evidence: vuln.evidence,
      affectedVersions: vuln.affected_versions,
      exploitPayloads: vuln.exploit_payloads,
      discoveredAt: vuln.discovered_at,
      riskRating: calculateRiskRating(vuln.severity, vuln.exploit_available, vuln.confidence_score),
      recommendations: generateRecommendations(vuln)
    })),
    payloadTests: {
      totalTests: payloadTests.length,
      successfulTests: payloadTests.filter(t => t.status === 'success').length,
      failedTests: payloadTests.filter(t => t.status === 'failed').length,
      blockedTests: payloadTests.filter(t => t.status === 'blocked').length,
      tests: payloadTests.map(test => ({
        target: test.target_url,
        payload: test.payload,
        payloadType: test.payload_type,
        status: test.status,
        responseTime: test.response_time,
        executedAt: test.executed_at,
        vulnerability: test.vulnerabilities ? {
          cve: test.vulnerabilities.cve,
          title: test.vulnerabilities.title,
          severity: test.vulnerabilities.severity
        } : null
      }))
    },
    riskAssessment: generateRiskAssessment(vulnerabilities),
    recommendations: generateOverallRecommendations(vulnerabilities),
    appendix: {
      methodology: generateMethodology(),
      references: generateReferences(),
      disclaimer: generateDisclaimer()
    }
  };

  if (format === 'html') {
    return generateHTMLReport(reportData);
  } else if (format === 'markdown') {
    return generateMarkdownReport(reportData);
  }

  return reportData;
}

function generateExecutiveSummary(scanData: any, vulnerabilities: any[]) {
  const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
  const high = vulnerabilities.filter(v => v.severity === 'high').length;
  const total = vulnerabilities.length;

  return `This vulnerability assessment was conducted on ${scanData.target} on ${new Date(scanData.started_at).toLocaleDateString()}. 
The assessment identified ${total} vulnerabilities, including ${critical} critical and ${high} high-severity issues. 
${critical > 0 ? 'Critical vulnerabilities require immediate attention and remediation.' : ''}
${high > 0 ? 'High-severity vulnerabilities should be addressed as a priority.' : ''}
The target system${total === 0 ? ' appears to be secure with no vulnerabilities detected.' : ' requires security improvements to address the identified vulnerabilities.'}`;
}

function calculateDuration(startTime: string, endTime: string | null) {
  if (!endTime) return 'Ongoing';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.round((end.getTime() - start.getTime()) / 1000);
  return `${duration} seconds`;
}

function calculateRiskRating(severity: string, exploitAvailable: boolean, confidence: number) {
  let baseScore;
  switch (severity) {
    case 'critical': baseScore = 9.0; break;
    case 'high': baseScore = 7.0; break;
    case 'medium': baseScore = 5.0; break;
    case 'low': baseScore = 3.0; break;
    default: baseScore = 1.0;
  }

  // Adjust score based on exploit availability and confidence
  if (exploitAvailable) baseScore += 1.0;
  const confidenceMultiplier = confidence / 100;
  const finalScore = Math.min(10.0, baseScore * confidenceMultiplier);

  return {
    score: Math.round(finalScore * 10) / 10,
    rating: finalScore >= 9.0 ? 'Critical' : 
            finalScore >= 7.0 ? 'High' : 
            finalScore >= 4.0 ? 'Medium' : 'Low'
  };
}

function generateRecommendations(vulnerability: any) {
  const recommendations = [];
  
  switch (vulnerability.severity) {
    case 'critical':
      recommendations.push('Immediate patching required - treat as emergency');
      recommendations.push('Consider temporary workarounds or service isolation');
      break;
    case 'high':
      recommendations.push('Apply security patches within 24-48 hours');
      recommendations.push('Monitor system logs for exploitation attempts');
      break;
    case 'medium':
      recommendations.push('Schedule patching within the next maintenance window');
      recommendations.push('Implement additional monitoring if possible');
      break;
    case 'low':
      recommendations.push('Address during regular maintenance cycles');
      break;
  }

  // Service-specific recommendations
  if (vulnerability.service_name === 'Apache') {
    recommendations.push('Update Apache to the latest stable version');
    recommendations.push('Review and harden Apache configuration');
  } else if (vulnerability.service_name === 'MySQL') {
    recommendations.push('Update MySQL to the latest version');
    recommendations.push('Review database access controls and permissions');
  }

  return recommendations;
}

function generateRiskAssessment(vulnerabilities: any[]) {
  const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
  const high = vulnerabilities.filter(v => v.severity === 'high').length;
  const medium = vulnerabilities.filter(v => v.severity === 'medium').length;
  const low = vulnerabilities.filter(v => v.severity === 'low').length;

  let overallRisk = 'Low';
  if (critical > 0) overallRisk = 'Critical';
  else if (high > 0) overallRisk = 'High';
  else if (medium > 0) overallRisk = 'Medium';

  return {
    overallRisk: overallRisk,
    riskFactors: [
      critical > 0 ? `${critical} critical vulnerabilities with potential for complete system compromise` : null,
      high > 0 ? `${high} high-severity vulnerabilities requiring urgent attention` : null,
      vulnerabilities.filter(v => v.exploit_available).length > 0 ? 'Exploits are publicly available for some vulnerabilities' : null
    ].filter(Boolean),
    businessImpact: generateBusinessImpact(overallRisk, vulnerabilities)
  };
}

function generateBusinessImpact(overallRisk: string, vulnerabilities: any[]) {
  switch (overallRisk) {
    case 'Critical':
      return 'High risk of data breaches, service disruption, and regulatory compliance issues. Immediate action required.';
    case 'High':
      return 'Significant risk of security incidents that could impact business operations and reputation.';
    case 'Medium':
      return 'Moderate risk that should be addressed to maintain security posture and prevent escalation.';
    default:
      return 'Low risk to business operations, but continued monitoring and maintenance recommended.';
  }
}

function generateOverallRecommendations(vulnerabilities: any[]) {
  const recommendations = [
    'Implement a regular vulnerability scanning schedule',
    'Establish a patch management process with defined SLAs',
    'Deploy security monitoring and incident response capabilities',
    'Conduct regular security awareness training for staff',
    'Implement network segmentation where possible',
    'Review and update security policies and procedures'
  ];

  if (vulnerabilities.some(v => v.service_name === 'Apache')) {
    recommendations.push('Harden web server configurations and implement WAF protection');
  }

  if (vulnerabilities.some(v => v.service_name === 'MySQL')) {
    recommendations.push('Implement database security best practices and access controls');
  }

  return recommendations;
}

function generateMethodology() {
  return `This vulnerability assessment was conducted using automated scanning techniques combined with manual verification. 
The assessment included:
1. Network port scanning and service enumeration
2. Vulnerability database lookup and correlation
3. Payload testing and exploitation verification
4. Risk assessment and impact analysis

The assessment utilized various public vulnerability databases including CVE, Exploit-DB, and OWASP resources.`;
}

function generateReferences() {
  return [
    'Common Vulnerabilities and Exposures (CVE) - https://cve.mitre.org/',
    'Exploit Database - https://www.exploit-db.com/',
    'OWASP Top 10 - https://owasp.org/www-project-top-ten/',
    'NIST Cybersecurity Framework - https://www.nist.gov/cyberframework',
    'SANS Top 25 Software Errors - https://www.sans.org/top25-software-errors/'
  ];
}

function generateDisclaimer() {
  return `This vulnerability assessment report is provided for security testing purposes only. 
The findings and recommendations in this report are based on automated scanning and may contain false positives. 
Manual verification is recommended before taking remediation actions. 
This assessment should be part of a comprehensive security program and not relied upon as the sole security measure.`;
}

function generateHTMLReport(reportData: any) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>${reportData.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; }
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; font-weight: bold; }
        .severity-medium { color: #ffc107; font-weight: bold; }
        .severity-low { color: #28a745; font-weight: bold; }
        .vuln-card { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${reportData.title}</h1>
        <p><strong>Generated:</strong> ${new Date(reportData.scanDetails.generatedAt).toLocaleString()}</p>
        <p><strong>Authorized by:</strong> ${reportData.scanDetails.authorizedBy}</p>
    </div>
    
    <h2>Executive Summary</h2>
    <p>${reportData.executiveSummary}</p>
    
    <h2>Vulnerability Statistics</h2>
    <table>
        <tr><th>Severity</th><th>Count</th></tr>
        <tr><td class="severity-critical">Critical</td><td>${reportData.statistics.criticalCount}</td></tr>
        <tr><td class="severity-high">High</td><td>${reportData.statistics.highCount}</td></tr>
        <tr><td class="severity-medium">Medium</td><td>${reportData.statistics.mediumCount}</td></tr>
        <tr><td class="severity-low">Low</td><td>${reportData.statistics.lowCount}</td></tr>
    </table>
    
    <h2>Vulnerabilities</h2>
    ${reportData.vulnerabilities.map((vuln: any) => `
        <div class="vuln-card">
            <h3 class="severity-${vuln.severity}">${vuln.title} (${vuln.cve})</h3>
            <p><strong>Severity:</strong> <span class="severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span></p>
            <p><strong>Service:</strong> ${vuln.service}:${vuln.port}</p>
            <p><strong>Description:</strong> ${vuln.description}</p>
            <p><strong>Risk Rating:</strong> ${vuln.riskRating.score}/10 (${vuln.riskRating.rating})</p>
        </div>
    `).join('')}
</body>
</html>`;
}

function generateMarkdownReport(reportData: any) {
  return `# ${reportData.title}

**Generated:** ${new Date(reportData.scanDetails.generatedAt).toLocaleString()}  
**Authorized by:** ${reportData.scanDetails.authorizedBy}  
**Target:** ${reportData.scanDetails.target}

## Executive Summary

${reportData.executiveSummary}

## Vulnerability Statistics

| Severity | Count |
|----------|-------|
| Critical | ${reportData.statistics.criticalCount} |
| High | ${reportData.statistics.highCount} |
| Medium | ${reportData.statistics.mediumCount} |
| Low | ${reportData.statistics.lowCount} |

## Risk Assessment

**Overall Risk:** ${reportData.riskAssessment.overallRisk}

${reportData.riskAssessment.riskFactors.map((factor: string) => `- ${factor}`).join('\n')}

## Vulnerabilities

${reportData.vulnerabilities.map((vuln: any) => `
### ${vuln.title} (${vuln.cve})

- **Severity:** ${vuln.severity.toUpperCase()}
- **Service:** ${vuln.service}:${vuln.port}
- **Risk Rating:** ${vuln.riskRating.score}/10 (${vuln.riskRating.rating})
- **Description:** ${vuln.description}
- **Exploit Available:** ${vuln.exploitAvailable ? 'Yes' : 'No'}

**Recommendations:**
${vuln.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`).join('\n')}

## Overall Recommendations

${reportData.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## Disclaimer

${reportData.appendix.disclaimer}`;
}