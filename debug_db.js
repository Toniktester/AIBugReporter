const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    acc[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('integrations').select('*').eq('provider', 'jira');
  console.log('Integrations:', JSON.stringify(data, null, 2));
  if (error) console.error("Error", error);

  // Now emulate user project fetch
  const { data: userProjects } = await supabase.from('project_users').select('*');
  console.log('User Projects:', JSON.stringify(userProjects, null, 2));
}

check().catch(console.error);
