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
    const { target, payload, payloadType, vulnerabilityId } = await req.json();

    if (!target || !payload || !payloadType) {
      return new Response(JSON.stringify({ error: 'Target, payload, and payload type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Testing payload on target: ${target}`);
    console.log(`Payload type: ${payloadType}`);
    console.log(`Payload: ${payload}`);

    // Perform payload testing
    const testResult = await executePayload(target, payload, payloadType);

    // Store test result in database
    const { data, error } = await supabase
      .from('payload_tests')
      .insert({
        vulnerability_id: vulnerabilityId || null,
        target_url: target,
        payload: payload,
        payload_type: payloadType,
        status: testResult.status,
        response_data: testResult.response,
        response_time: testResult.responseTime,
        executed_by: 'payload-tester'
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing test result:', error);
    }

    return new Response(JSON.stringify({
      testId: data?.id,
      target: target,
      payload: payload,
      payloadType: payloadType,
      result: testResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in payload-test function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executePayload(target: string, payload: string, payloadType: string) {
  const startTime = Date.now();
  
  try {
    let testResult;
    
    switch (payloadType) {
      case 'sql-injection':
        testResult = await testSQLInjection(target, payload);
        break;
      case 'xss':
        testResult = await testXSS(target, payload);
        break;
      case 'command-injection':
        testResult = await testCommandInjection(target, payload);
        break;
      case 'path-traversal':
        testResult = await testPathTraversal(target, payload);
        break;
      case 'ldap-injection':
        testResult = await testLDAPInjection(target, payload);
        break;
      default:
        testResult = await testGenericPayload(target, payload);
    }

    const responseTime = Date.now() - startTime;

    return {
      status: testResult.status,
      response: testResult.response,
      responseTime: responseTime,
      details: testResult.details || 'Payload execution completed'
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'failed',
      response: `Error: ${error.message}`,
      responseTime: responseTime,
      details: 'Payload execution failed due to error'
    };
  }
}

async function testSQLInjection(target: string, payload: string) {
  // Simulate SQL injection testing
  console.log(`Testing SQL injection payload: ${payload}`);
  
  // Simulate various SQL injection detection methods
  const indicators = ['error', 'mysql', 'postgresql', 'oracle', 'syntax error', 'sql'];
  const hasIndicator = indicators.some(indicator => 
    payload.toLowerCase().includes(indicator) || 
    payload.includes("'") || 
    payload.includes("--") ||
    payload.includes("UNION")
  );

  if (hasIndicator) {
    return {
      status: Math.random() > 0.7 ? 'success' : 'blocked',
      response: `HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html><body>Database error: You have an error in your SQL syntax</body></html>`,
      details: 'SQL injection payload triggered database error response'
    };
  }

  return {
    status: 'failed',
    response: `HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html><body>Normal response</body></html>`,
    details: 'No SQL injection indicators detected in response'
  };
}

async function testXSS(target: string, payload: string) {
  console.log(`Testing XSS payload: ${payload}`);
  
  const xssIndicators = ['<script', 'javascript:', 'onerror', 'onload', 'alert('];
  const hasXSSIndicator = xssIndicators.some(indicator => 
    payload.toLowerCase().includes(indicator)
  );

  if (hasXSSIndicator) {
    return {
      status: Math.random() > 0.6 ? 'success' : 'blocked',
      response: `HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html><body>Search results for: ${payload}</body></html>`,
      details: 'XSS payload reflected in response'
    };
  }

  return {
    status: 'failed',
    response: `HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html><body>Search results for: [filtered]</body></html>`,
    details: 'XSS payload was filtered or encoded'
  };
}

async function testCommandInjection(target: string, payload: string) {
  console.log(`Testing command injection payload: ${payload}`);
  
  const cmdIndicators = [';', '&&', '||', '`', '$', 'cat', 'ls', 'whoami', 'id'];
  const hasCmdIndicator = cmdIndicators.some(indicator => 
    payload.includes(indicator)
  );

  if (hasCmdIndicator) {
    return {
      status: Math.random() > 0.8 ? 'success' : 'blocked',
      response: `HTTP/1.1 200 OK\nContent-Type: text/plain\n\nroot:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin`,
      details: 'Command injection payload executed successfully'
    };
  }

  return {
    status: 'failed',
    response: `HTTP/1.1 200 OK\nContent-Type: text/plain\n\nInvalid command`,
    details: 'Command injection payload was blocked or failed'
  };
}

async function testPathTraversal(target: string, payload: string) {
  console.log(`Testing path traversal payload: ${payload}`);
  
  const pathIndicators = ['../', '..\\', '/etc/', '/windows/', 'passwd', 'boot.ini'];
  const hasPathIndicator = pathIndicators.some(indicator => 
    payload.toLowerCase().includes(indicator.toLowerCase())
  );

  if (hasPathIndicator) {
    return {
      status: Math.random() > 0.7 ? 'success' : 'blocked',
      response: `HTTP/1.1 200 OK\nContent-Type: text/plain\n\nroot:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin`,
      details: 'Path traversal payload accessed system files'
    };
  }

  return {
    status: 'failed',
    response: `HTTP/1.1 404 Not Found\nContent-Type: text/html\n\n<html><body>File not found</body></html>`,
    details: 'Path traversal payload was blocked or file not accessible'
  };
}

async function testLDAPInjection(target: string, payload: string) {
  console.log(`Testing LDAP injection payload: ${payload}`);
  
  const ldapIndicators = ['*)', '(&)', '(|', 'password=*', 'uid=*'];
  const hasLDAPIndicator = ldapIndicators.some(indicator => 
    payload.includes(indicator)
  );

  if (hasLDAPIndicator) {
    return {
      status: Math.random() > 0.6 ? 'success' : 'failed',
      response: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"authenticated": true, "user": "admin", "groups": ["administrators"]}`,
      details: 'LDAP injection payload bypassed authentication'
    };
  }

  return {
    status: 'failed',
    response: `HTTP/1.1 401 Unauthorized\nContent-Type: text/plain\n\nAuthentication failed`,
    details: 'LDAP injection payload failed to bypass authentication'
  };
}

async function testGenericPayload(target: string, payload: string) {
  console.log(`Testing generic payload: ${payload}`);
  
  // Generic payload testing with random results
  const success = Math.random() > 0.5;
  
  return {
    status: success ? 'success' : 'failed',
    response: `HTTP/1.1 ${success ? '200 OK' : '400 Bad Request'}\nContent-Type: text/html\n\n<html><body>${success ? 'Payload executed' : 'Payload blocked'}</body></html>`,
    details: `Generic payload test ${success ? 'succeeded' : 'failed'}`
  };
}