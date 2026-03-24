import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
    console.log("Fetching integrations...")
    const { data: integrations, error } = await supabase.from('integrations').select('*').eq('provider', 'jira').limit(1);
    if (error) {
        console.error("Supabase error:", error);
        return;
    }
    
    const jiraConf = integrations?.[0]?.config;
    if (!jiraConf || !jiraConf.domain) {
        console.error("No Jira config found.");
        return;
    }

    const basicAuth = Buffer.from(`${jiraConf.email}:${jiraConf.apiToken}`).toString('base64');
    
    // Let's first search for an issue to get a valid ID
    const searchUrl = `https://${jiraConf.domain}.atlassian.net/rest/api/3/search/jql?jql=project="${jiraConf.projectKey}"&maxResults=1`;
    const searchRes = await fetch(searchUrl, {
        headers: { 'Authorization': `Basic ${basicAuth}`, 'Accept': 'application/json' }
    });
    
    if (!searchRes.ok) {
        console.error("Search failed:", await searchRes.text());
        return;
    }
    
    const searchData = await searchRes.json();
    if (!searchData.issues || searchData.issues.length === 0) {
        console.log("No issues found in project to test with.");
        return;
    }
    
    const jiraStoryId = searchData.issues[0].key;
    console.log(`Found issue to test: ${jiraStoryId}`);
    
    // Now simulate the fetch from route.ts
    const url = `https://${jiraConf.domain}.atlassian.net/rest/api/3/issue/${jiraStoryId}`;
    console.log(`Fetching from: ${url}`);
    const r = await fetch(url, { headers: { 'Authorization': `Basic ${basicAuth}`, 'Accept': 'application/json' }});
    
    if (r.ok) {
        const storyData = await r.json();
        const s_summary = storyData.fields.summary || '';
        let s_desc = '';
        if (storyData.fields.description?.content) {
            const extractText = (nodes) => nodes.map((n) => (n.text ? n.text : (n.content ? extractText(n.content) : ''))).join(' ');
            s_desc = extractText(storyData.fields.description.content);
        } else if (typeof storyData.fields.description === 'string') {
            s_desc = storyData.fields.description;
        }
        
        console.log("Summary:", s_summary);
        console.log("Extracted Description:", s_desc);
        console.log("Description Length:", s_desc.length);
        
        const storyContext = `\n[STEP 1 - READ STORY CONTEXT]:\nStory ID: ${jiraStoryId}\nStory Title: ${s_summary}\nAcceptance Criteria / Details: ${s_desc.substring(0, 3000)}\n\n`;
        console.log("Final Context Preview:\n", storyContext);
    } else {
        console.error("Failed to fetch issue:", await r.text());
    }
}

run();
