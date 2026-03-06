import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { LogOut, LayoutDashboard, Bug, Settings, BarChart2 } from 'lucide-react'
import DashboardCharts from './DashboardCharts'

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get today's start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // Fetch total bugs today
    const { count: totalBugsToday } = await supabase
        .from('bugs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr);

    // Fetch critical bugs today
    const { count: criticalBugsToday } = await supabase
        .from('bugs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .gte('created_at', todayStr);

    // Fetch active integrations
    const { count: activeIntegrations } = await supabase
        .from('integrations')
        .select('*', { count: 'exact', head: true });

    // Fetch all bugs for analytics
    const { data: allBugs } = await supabase
        .from('bugs')
        .select('*');

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} glass`}>
                <div className={styles.sidebarHeader}>
                    <Bug className="text-gradient" size={28} />
                    <h2>AI Reporter</h2>
                </div>

                <nav className={styles.sidebarNav}>
                    <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <Link href="/bugs" className={styles.navItem}>
                        <Bug size={20} />
                        <span>All Bugs</span>
                    </Link>
                    <Link href="/reports" className={styles.navItem}>
                        <BarChart2 size={20} />
                        <span>Reports</span>
                    </Link>
                    <Link href="/settings" className={styles.navItem}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user.user_metadata?.full_name || 'User'}</span>
                            <span className={styles.userEmail}>{user.email}</span>
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
                    <h1>Dashboard Overview</h1>
                    <div className={styles.actions}>
                        <Link href="/bugs/new" className={styles.primaryBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bug size={16} /> New Bug Report
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
                            <p>Critical Defects Today</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                            <BarChart2 size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{totalBugsToday || 0}</h3>
                            <p>Total Logged Today</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)' }}>
                            <Settings size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{activeIntegrations || 0}</h3>
                            <p>Active Integrations</p>
                        </div>
                    </div>
                </div>

                <DashboardCharts bugs={allBugs || []} />

            </main>
        </div>
    )
}
