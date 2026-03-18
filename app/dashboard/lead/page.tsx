import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../page.module.css'
import { LogOut, LayoutDashboard, Bug, Users, Settings, BarChart2, Briefcase } from 'lucide-react'
import DashboardCharts from '../DashboardCharts'

export default async function LeadDashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Fetch projects where the user is a lead/member
    const { data: userProjects } = await supabase
        .from('project_users')
        .select('project_id')
        .eq('user_id', user.id);

    const projectIds = userProjects?.map(p => p.project_id) || [];

    // 2. Fetch bugs only for those projects
    const { data: leadBugs } = await supabase
        .from('bugs')
        .select('*')
        .in('project_id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000']); // dummy UUID fallback

    const criticalBugs = leadBugs?.filter(b => b.severity === 'critical') || [];
    const openBugs = leadBugs?.filter(b => b.status === 'open' || b.status === 'in_progress') || [];

    return (
        <div className={styles.layout}>
            {/* Lead Sidebar */}
            <aside className={`${styles.sidebar} glass`}>
                <div className={styles.sidebarHeader}>
                    <img src="/logo.png" alt="AI Reporter Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                    <h2 style={{ fontSize: '1.4rem' }}>Lead Portal</h2>
                </div>

                <nav className={styles.sidebarNav}>
                    <Link href="/dashboard/lead" className={`${styles.navItem} ${styles.active}`}>
                        <LayoutDashboard size={20} />
                        <span>Team Metrics</span>
                    </Link>
                    <Link href="/dashboard/lead/bugs" className={styles.navItem}>
                        <Bug size={20} />
                        <span>Review Bugs</span>
                    </Link>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link href="/reports" className={styles.navItem}>
                            <BarChart2 size={20} />
                            <span>Team Reports</span>
                        </Link>
                        <Link href="/reports/story" className={styles.navItem} style={{ paddingLeft: '3rem', fontSize: '0.9rem' }}>
                            <span>Story Reports</span>
                        </Link>
                    </div>
                    <Link href="/settings" className={styles.navItem}>
                        <Settings size={20} />
                        <span>Project Settings</span>
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar} style={{ background: 'var(--success-color)' }}>
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user.user_metadata?.full_name || 'Team Lead'}</span>
                            <span className={styles.userEmail} style={{ fontSize: '0.7rem', color: 'var(--success-color)' }}>QA Lead</span>
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
                    <h1>Team Lead Overview</h1>
                </header>

                <div className={styles.dashboardGrid}>
                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
                            <Bug size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{criticalBugs.length}</h3>
                            <p>Critical Team Defects</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <BarChart2 size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{openBugs.length}</h3>
                            <p>Open / Triaging Bugs</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)' }}>
                            <Briefcase size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{projectIds.length}</h3>
                            <p>Assigned Projects</p>
                        </div>
                    </div>
                </div>

                {/* Team Lead specific chart data */}
                <DashboardCharts bugs={leadBugs || []} />

            </main>
        </div>
    )
}
