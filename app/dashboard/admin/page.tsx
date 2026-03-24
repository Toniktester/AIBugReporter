export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from '../page.module.css'
import { LogOut, LayoutDashboard, Bug, Users, Settings, BarChart2, Mail } from 'lucide-react'
import DashboardCharts from '../DashboardCharts'
import { fetchJiraBugs } from '@/utils/jira'
import MobileMenuToggle from '@/components/MobileMenuToggle'

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all bugs from Jira for unified analytics
    const { bugs: allBugs } = await fetchJiraBugs(supabase as any);
    
    // Global counts mapped from Jira (We group Critical and High priorities together as 'Urgent' metrics for the dashboard)
    const criticalBugs = allBugs.filter((b: any) => b.severity === 'critical' || b.severity === 'high').length;
    const totalBugs = allBugs.length;
    
    // Note: To bypass Row Level Security returning 1 (self), use the Service Role Key here
    const sbAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const { count: totalUsers } = await sbAdmin.from('users').select('*', { count: 'exact', head: true })

    return (
        <div className={styles.layout}>
            {/* Admin Sidebar */}
            <aside className={`${styles.sidebar} glass`}>
                <div className={styles.sidebarHeader}>
                    <img src="/logo.png" alt="AI Reporter Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                    <h2 style={{ fontSize: '1.4rem' }}>Admin Portal</h2>
                </div>

                <nav className={styles.sidebarNav}>
                    <Link href="/dashboard/admin" className={`${styles.navItem} ${styles.active}`}>
                        <LayoutDashboard size={20} />
                        <span>Metrics</span>
                    </Link>
                    <Link href="/dashboard/admin/users" className={styles.navItem}>
                        <Users size={20} />
                        <span>Manage Users</span>
                    </Link>
                    <Link href="/bugs" className={styles.navItem}>
                        <Bug size={20} />
                        <span>My Bugs</span>
                    </Link>
                    <Link href="/bugs/all" className={styles.navItem}>
                        <Bug size={20} />
                        <span>All Bugs</span>
                    </Link>
                    <Link href="/reports" className={styles.navItem}>
                        <BarChart2 size={20} />
                        <span>Reports</span>
                    </Link>
                    <Link href="/dashboard/daily-status" className={styles.navItem}>
                        <Mail size={20} />
                        <span>Daily Status Report</span>
                    </Link>
                    <Link href="/settings" className={styles.navItem}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar} style={{ background: 'var(--danger-color)' }}>
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user.user_metadata?.full_name || 'Admin'}</span>
                            <span className={styles.userEmail} style={{ fontSize: '0.7rem', color: 'var(--danger-color)' }}>Administrator</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <MobileMenuToggle />
                        <h1>Global System Analytics</h1>
                    </div>
                </header>

                <div className={styles.dashboardGrid}>
                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
                            <Bug size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{criticalBugs || 0}</h3>
                            <p>Critical Defects</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                            <BarChart2 size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{totalBugs || 0}</h3>
                            <p>Total Platform Bugs</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} glass`}>
                        <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)' }}>
                            <Users size={24} />
                        </div>
                        <div className={styles.statData}>
                            <h3>{totalUsers || 0}</h3>
                            <p>Registered Users</p>
                        </div>
                    </div>
                </div>

                <DashboardCharts bugs={allBugs || []} />

            </main>
        </div>
    )
}
