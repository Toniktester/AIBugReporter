export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { LogOut, LayoutDashboard, Bug, Settings, BarChart2 } from 'lucide-react'
import DashboardCharts from './DashboardCharts'
import BugFilterBar from '@/components/BugFilterBar'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<any> }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    let userRole = 'tester';
    try {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile) userRole = profile.role;
    } catch (e) { }

    if (user.email?.toLowerCase() === 'admin@tonik.com') {
        userRole = 'admin';
    }

    if (userRole === 'admin') {
        redirect('/dashboard/admin');
    } else if (userRole === 'qa_lead') {
        redirect('/dashboard/lead');
    }

    const resolvedParams = await searchParams;

    // Fetch projects for the filter bar
    const { data: projects } = await supabase.from('projects').select('id, name');
    
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
        // format needs to be yyyy-MM-dd
        const s = new Date(resolvedParams.start).toISOString().split('T')[0];
        baseJql += ` AND created >= "${s}"`;
    }
    
    if (resolvedParams.end) {
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

    const allBugs = allBugsRaw || [];
    
    // Server-side aggregations for standard stats top bar
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalBugsToday = allBugs.filter(b => new Date(b.created_at) >= today).length;
    const criticalBugsToday = allBugs.filter(b => b.severity === 'critical' && new Date(b.created_at) >= today).length;

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} glass`}>
                <div className={styles.sidebarHeader}>
                    <img src="/logo.png" alt="AI Reporter Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                    <h2 style={{ fontSize: '1.4rem' }}>AI Reporter</h2>
                </div>

                <nav className={styles.sidebarNav}>
                    <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
                        <LayoutDashboard size={20} />
                        <span>My Dashboard</span>
                    </Link>
                    <Link href="/bugs" className={styles.navItem}>
                        <Bug size={20} />
                        <span>My Bugs</span>
                    </Link>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link href="/reports" className={styles.navItem}>
                            <BarChart2 size={20} />
                            <span>Reports</span>
                        </Link>
                        <Link href="/reports/story" className={styles.navItem} style={{ paddingLeft: '3rem', fontSize: '0.9rem' }}>
                            <span>Story Reports</span>
                        </Link>
                    </div>
                    </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user.user_metadata?.full_name || 'User'}</span>
                            <span className={styles.userEmail}>{user.email}</span>
                            <span className={styles.userEmail} style={{ fontSize: '0.7rem', color: 'var(--primary-color)' }}>Tester</span>
                        </div>
                    </div>
                    <form action={async () => {
                        'use server'
                        const sb = await createClient()
                        await sb.auth.signOut()
                        redirect('/login')
                    }}>
                        <button className={styles.logoutBtn} title="Log Out">
                            <LogOut size={18} />
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                <header className={styles.topbar}>
                    <h1>My Tester Dashboard</h1>
                    <div className={styles.actions}>
                        <Link href="/bugs/new" className={styles.primaryBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bug size={16} /> Report New Bug
                        </Link>
                    </div>
                </header>

                <div className={styles.dashboardGrid}>
                    {/* Stats Cards */}
                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
                            <Bug size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{criticalBugsToday || 0}</h3>
                            <p>Critical Bugs Today (Jira)</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                            <BarChart2 size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{totalBugsToday || 0}</h3>
                            <p>Total Logged Today (Jira)</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)' }}>
                            <Settings size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{allBugs?.length || 0}</h3>
                            <p>Lifetime Bugs Reported (Jira)</p>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <BugFilterBar projects={projects || []} />
                </div>

                {jiraIntegrations?.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', marginTop: '2rem', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Jira Connection Required</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Bugs are now fetched directly from Atlassian Jira in real-time. Please contact your administrator to verify your project's Jira configuration.
                        </p>
                    </div>
                )}

                {jiraIntegrations && jiraIntegrations.length > 0 && <DashboardCharts bugs={allBugs || []} />}

            </main>
        </div>
    )
}
