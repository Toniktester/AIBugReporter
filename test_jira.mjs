import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
    console.log("Fetching integrations...")
    const { data: jiraIntegrations, error } = await supabase.from('integrations').select('*').eq('provider', 'jira');
    if (error) console.error("Supabase error:", error);
    console.log(`Found ${jiraIntegrations?.length || 0} Jira integrations.`)
    
    if (jiraIntegrations && jiraIntegrations.length > 0) {
        for (const integration of jiraIntegrations) {
            const config = integration.config;
            const basicAuth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
            const baseUrl = `https://${config.domain}.atlassian.net/rest/api/3/search/jql`;
            console.log("Fetching from:", baseUrl);
            
            const baseJql = `issuetype = "Bug"`;
            const jql = `project = "${config.projectKey}" AND ${baseJql}`;
            
            let startAt = 0;
            const qs = `jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=100&fields=summary,status,priority,created`;
            const res = await fetch(`${baseUrl}?${qs}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Accept': 'application/json'
                }
            });

            console.log("Jira HTTP status:", res.status);
            const data = await res.json();
            if (!res.ok) {
                console.error("Jira error:", data);
            } else {
                console.log("Keys:", Object.keys(data));
                console.log("Total:", data.total);
                if (data.issues) {
                    console.log(`Found ${data.issues.length} issues.`);
                    if(data.issues.length > 0) {
                        const i = data.issues[0];
                        console.log("Sample issue:", { key: i.key, summary: i.fields.summary, status: i.fields.status?.name, priority: i.fields.priority?.name })
                    }
                }
            }
        }
    }
}

run()
