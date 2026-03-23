import { createClient } from '@/utils/supabase/server'

export async function fetchJiraBugsForIntegrations(jiraIntegrations: any[], resolvedParams?: any) {
    let allBugsRaw: any[] = [];
    
    // Build Dynamic JQL Filters
    let baseJql = `issuetype = "Bug"`;
    if (resolvedParams?.status) {
        let mappedStatus = resolvedParams.status;
        if (mappedStatus === 'open') mappedStatus = "To Do";
        if (mappedStatus === 'in_progress') mappedStatus = "In Progress";
        if (mappedStatus === 'resolved' || mappedStatus === 'closed') mappedStatus = "Done";
        baseJql += ` AND status = "${mappedStatus}"`;
    }
    
    if (resolvedParams?.severity) {
        let mappedPriority = resolvedParams.severity;
        if (mappedPriority === 'critical') mappedPriority = "Highest";
        if (mappedPriority === 'high') mappedPriority = "High";
        if (mappedPriority === 'medium') mappedPriority = "Medium";
        if (mappedPriority === 'low') mappedPriority = "Low";
        baseJql += ` AND priority = "${mappedPriority}"`;
    }
    
    if (resolvedParams?.start) {
        // format needs to be yyyy-MM-dd
        const s = new Date(resolvedParams.start).toISOString().split('T')[0];
        baseJql += ` AND created >= "${s}"`;
    }
    
    if (resolvedParams?.end) {
        const e = new Date(resolvedParams.end);
        e.setDate(e.getDate() + 1); // add 1 day for inclusive end
        const es = e.toISOString().split('T')[0];
        baseJql += ` AND created < "${es}"`;
    }

    // Call Jira for each integration
    if (jiraIntegrations && jiraIntegrations.length > 0) {
        for (const integration of jiraIntegrations) {
            if (!integration.config?.domain || !integration.config?.projectKey) continue;
            const config = integration.config;
            const basicAuth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
            const baseUrl = `https://${config.domain}.atlassian.net/rest/api/3/search`;
            
            const jql = `project = "${config.projectKey}" AND ${baseJql}`;
            
            try {
                let startAt = 0;
                let fetchMore = true;
                while (fetchMore) {
                    const res = await fetch(baseUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${basicAuth}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ jql, startAt, maxResults: 100, fields: ['summary', 'status', 'priority', 'created'] })
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        if (data.issues) {
                            const mappedIssues = data.issues.map((i: any) => {
                                let sev = 'medium';
                                const prio = i.fields.priority?.name?.toLowerCase() || '';
                                if (prio === 'highest') sev = 'critical';
                                else if (prio === 'high') sev = 'high';
                                else if (prio === 'low' || prio === 'lowest') sev = 'low';
                                
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
                        
                        if (startAt + 100 >= (data.total || 0)) {
                            fetchMore = false;
                        } else {
                            startAt += 100;
                        }
                    } else {
                        fetchMore = false;
                    }
                }
            } catch (e) {
                console.error("Failed to fetch Jira bugs for project:", config.projectKey, e);
            }
        }
    }

    return allBugsRaw;
}
