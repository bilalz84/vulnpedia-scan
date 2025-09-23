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

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listPayloads(req);
      case 'sync':
        return await syncExternalPayloads(req);
      case 'search':
        return await searchPayloads(req);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in payload-library function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function listPayloads(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const category = url.searchParams.get('category');

  let query = supabase.from('payload_library').select('*');

  if (type) {
    query = query.eq('type', type);
  }
  
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ payloads: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function syncExternalPayloads(req: Request) {
  console.log('Syncing external payloads from GitHub and other sources...');

  try {
    // Fetch payloads from various GitHub repositories
    const githubPayloads = await fetchGitHubPayloads();
    const exploitDBPayloads = await fetchExploitDBPayloads();
    const owasp10Payloads = await fetchOWASPTop10Payloads();

    const allPayloads = [...githubPayloads, ...exploitDBPayloads, ...owasp10Payloads];
    let syncedCount = 0;

    for (const payload of allPayloads) {
      // Check if payload already exists
      const { data: existing } = await supabase
        .from('payload_library')
        .select('id')
        .eq('payload', payload.payload)
        .eq('type', payload.type)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('payload_library')
          .insert(payload);

        if (!error) {
          syncedCount++;
        }
      }
    }

    console.log(`Synced ${syncedCount} new payloads`);

    return new Response(JSON.stringify({ 
      message: `Successfully synced ${syncedCount} new payloads`,
      syncedCount: syncedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error syncing payloads:', error);
    return new Response(JSON.stringify({ error: 'Failed to sync payloads' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function searchPayloads(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '';
  const type = url.searchParams.get('type');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Search query is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let dbQuery = supabase
    .from('payload_library')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,payload.ilike.%${query}%`);

  if (type) {
    dbQuery = dbQuery.eq('type', type);
  }

  const { data, error } = await dbQuery.order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ payloads: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchGitHubPayloads() {
  // Simulated GitHub payload fetching from popular security repositories
  return [
    {
      name: 'PayloadsAllTheThings SQL Injection',
      type: 'sql-injection',
      payload: "admin' OR '1'='1' /*",
      description: 'SQL injection payload for MySQL authentication bypass',
      source: 'PayloadsAllTheThings',
      source_url: 'https://github.com/swisskyrepo/PayloadsAllTheThings',
      category: 'authentication'
    },
    {
      name: 'XSS Hunter Basic Payload',
      type: 'xss',
      payload: '<script>alert(String.fromCharCode(88,83,83))</script>',
      description: 'Encoded XSS payload to bypass basic filters',
      source: 'XSS Hunter',
      source_url: 'https://github.com/mandatoryprogrammer/xsshunter-express',
      category: 'client-side'
    },
    {
      name: 'Command Injection via Ping',
      type: 'command-injection',
      payload: '127.0.0.1; whoami',
      description: 'Command injection via ping command',
      source: 'HackerOne',
      source_url: 'https://github.com/hackerone/payloads',
      category: 'server-side'
    }
  ];
}

async function fetchExploitDBPayloads() {
  // Simulated Exploit-DB payload fetching
  return [
    {
      name: 'Exploit-DB PHP Object Injection',
      type: 'object-injection',
      payload: 'O:8:"stdClass":1:{s:4:"exec";s:10:"phpinfo();";}',
      description: 'PHP object injection payload',
      source: 'Exploit-DB',
      source_url: 'https://www.exploit-db.com/',
      category: 'server-side'
    },
    {
      name: 'Exploit-DB LDAP Injection',
      type: 'ldap-injection',
      payload: '*)(|(password=*))',
      description: 'LDAP injection to bypass authentication',
      source: 'Exploit-DB',
      source_url: 'https://www.exploit-db.com/',
      category: 'authentication'
    }
  ];
}

async function fetchOWASPTop10Payloads() {
  // OWASP Top 10 related payloads
  return [
    {
      name: 'OWASP A01 Broken Access Control',
      type: 'path-traversal',
      payload: '../admin/config.php',
      description: 'Path traversal to access admin configuration',
      source: 'OWASP',
      source_url: 'https://owasp.org/Top10/',
      category: 'server-side'
    },
    {
      name: 'OWASP A03 XML External Entity',
      type: 'xxe',
      payload: '<!DOCTYPE foo [<!ELEMENT foo ANY ><!ENTITY xxe SYSTEM "file:///etc/passwd" >]><foo>&xxe;</foo>',
      description: 'XXE payload to read system files',
      source: 'OWASP',
      source_url: 'https://owasp.org/Top10/',
      category: 'server-side'
    }
  ];
}