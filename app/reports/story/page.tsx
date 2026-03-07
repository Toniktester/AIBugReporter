import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart2 } from 'lucide-react'
import StoryReportClient from './StoryReportClient'

export default async function StoryReportPage({ searchParams }: { searchParams: Promise<any> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const resolvedParams = await searchParams;

    // Fetch projects for the filter bar
    const { data: projects } = await supabase.from('projects').select('id, name')

    // Fetch all Jira integrations
    let integrQuery = supabase.from('integrations').select('*').eq('provider', 'jira');
    if (resolvedParams.project) integrQuery = integrQuery.eq('project_id', resolvedParams.project);
    const { data: jiraIntegrations } = await integrQuery;

    let allBugsRaw: any[] = [];
    
    // Build Dynamic JQL Filters
    let baseJql = `issuetype = "Bug"`;
    if (resolvedParams.status) {
        let mappedStatus = resolvedParams.status;
        if (mappedStatus === 'open') mappedStatus = "To Do";
        if (mappedStatus === 'in_progress') mappedStatus = "In Progress";
        if (mappedStatus === 'resolved' || mappedStatus === 'closed') mappedStatus = "Done";
        baseJql += ` AND status = "${mappedStatus}"`;
    }
    
    if (resolvedParams.severity) {
        let mappedPriority = resolvedParams.severity;
        if (mappedPriority === 'critical') mappedPriority = "Highest";
        if (mappedPriority === 'high') mappedPriority = "High";
        if (mappedPriority === 'medium') mappedPriority = "Medium";
        if (mappedPriority === 'low') mappedPriority = "Low";
        baseJql += ` AND priority = "${mappedPriority}"`;
    }
    
    if (resolvedParams.start) {
        const s = new Date(resolvedParams.start).toISOString().split('T')[0];
        baseJql += ` AND created >= "${s}"`;
    }
    
    if (resolvedParams.end) {
        const e = new Date(resolvedParams.end);
        e.setDate(e.getDate() + 1);
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
                const res = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${basicAuth}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Atlassian-Token': 'no-check'
                    },
                    // include issuelinks to extract parent story mapping
                    body: JSON.stringify({ jql, maxResults: 100, fields: ['summary', 'status', 'priority', 'created', 'issuelinks'] })
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
                            
                            // Extract Story ID from issueLinks (Relates to outward)
                            let storyId = null;
                            if (i.fields.issuelinks && i.fields.issuelinks.length > 0) {
                                const link = i.fields.issuelinks.find((l: any) => l.type.name === 'Relates' && l.outwardIssue);
                                if (link) {
                                    storyId = link.outwardIssue.key;
                                }
                            }
                            
                            return {
                                id: i.key,
                                project_id: integration.project_id,
                                summary: i.fields.summary,
                                severity: sev,
                                status: stat,
                                created_at: i.fields.created,
                                jira_story_id: storyId
                            };
                        });
                        
                        // Client requested to filter by specific story? Filter it after fetch
                        let filteredIssues = mappedIssues;
                        if (resolvedParams.story) {
                            filteredIssues = mappedIssues.filter((m: any) => m.jira_story_id === resolvedParams.story);
                        }
                        allBugsRaw = [...allBugsRaw, ...filteredIssues];
                    }
                }
            } catch (e) {
                console.error("Failed to fetch Jira bugs for story report:", config.projectKey, e);
            }
        }
    }

    return (
        <div style={{ padding: '2rem 3rem', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <h1 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BarChart2 size={24} className="text-gradient" />
                        Story-wise Defect Report
                    </h1>
                </div>
            </header>

            <main>
                {jiraIntegrations?.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', marginTop: '2rem', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Jira Connection Required</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            We need a Jira connection to pull the latest story analytics from Atlassian.
                        </p>
                        <Link href="/settings" style={{ padding: '0.5rem 1rem', background: 'var(--primary-color)', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>
                            Configure Jira
                        </Link>
                    </div>
                ) : (
                    <StoryReportClient bugs={allBugsRaw || []} projects={projects || []} />
                )}
            </main>
        </div>
    )
}
