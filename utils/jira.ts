import { SupabaseClient } from '@supabase/supabase-js'

export async function fetchJiraBugs(supabase: SupabaseClient, projectIds?: string[], customJql?: string) {
    // 1. Fetch integrations
    let integrQuery = supabase.from('integrations').select('*').eq('provider', 'jira');
    if (projectIds && projectIds.length > 0) {
        integrQuery = integrQuery.in('project_id', projectIds);
    }
    const { data: jiraIntegrations } = await integrQuery;

    let allBugsRaw: any[] = [];

    if (!jiraIntegrations || jiraIntegrations.length === 0) {
        return { bugs: [], integrations: [] }
    }

    const uniqueKeys = new Set<string>();
    const uniqueIntegrations: any[] = [];
    for (const integration of jiraIntegrations) {
        if (!integration.config?.projectKey) continue;
        if (!uniqueKeys.has(integration.config.projectKey)) {
            uniqueKeys.add(integration.config.projectKey);
            uniqueIntegrations.push(integration);
        }
    }

    // 2. Fetch from Jira for each valid integration
    for (const integration of uniqueIntegrations) {
        if (!integration.config?.domain || !integration.config?.projectKey) continue;
        const config = integration.config;
        const basicAuth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
        const baseUrl = `https://${config.domain}.atlassian.net/rest/api/3/search/jql`;
        
        let baseJql = customJql ? customJql : `issuetype = "Bug"`;
        const jql = `project = "${config.projectKey}" AND ${baseJql}`;
        
        try {
            let startAt = 0;
            let fetchMore = true;
            while (fetchMore) {
                const qs = `jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=100&fields=summary,status,priority,created`;
                const res = await fetch(`${baseUrl}?${qs}`, {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Authorization': `Basic ${basicAuth}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.issues) {
                        const mappedIssues = data.issues.map((i: any) => {
                            let sev = 'medium';
                            const prio = i.fields.priority?.name?.toLowerCase() || '';
                            if (prio === 'highest') sev = 'critical';
                            else if (prio === 'high') sev = 'high';
                            else if (prio === 'lowest' || prio === 'low') sev = 'low';
                            
                            let stat = 'open';
                            const st = i.fields.status?.name?.toLowerCase() || '';
                            if (st === 'in progress') stat = 'in_progress';
                            else if (st === 'done' || st === 'resolved') stat = 'resolved';
                            
                            return {
                                id: i.key,
                                project_id: integration.project_id,
                                summary: i.fields.summary,
                                severity: sev,
                                status: stat,
                                created_at: i.fields.created
                            };
                        });
                        allBugsRaw = [...allBugsRaw, ...mappedIssues];
                    }
                    
                    if (data.isLast !== undefined) {
                        fetchMore = !data.isLast;
                        startAt += 100;
                    } else if (data.total !== undefined) {
                        fetchMore = startAt + 100 < data.total;
                        startAt += 100;
                    } else {
                        fetchMore = false;
                    }
                } else {
                    fetchMore = false;
                }
            }
        } catch (e) {
            console.error("Failed to fetch Jira bugs for project:", config.projectKey, e);
        }
    }

    return { bugs: allBugsRaw, integrations: jiraIntegrations }
}
