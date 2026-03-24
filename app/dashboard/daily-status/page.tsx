import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from '../page.module.css';
import { LogOut, LayoutDashboard, Bug, BarChart2, Mail } from 'lucide-react';
import MobileMenuToggle from '@/components/MobileMenuToggle';
import DSRClient from './DSRClient';

export default async function DSRPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    let role = 'tester';
    const { data: roleData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (roleData) role = roleData.role;
    if (user.email?.toLowerCase() === 'admin@tonik.com') role = 'admin';

    const { data: integrationData } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'dsr_email')
        .single();
    
    const defaultConfig = {
        to: "",
        cc: "",
        bcc: "",
        subject: "Daily QA Status Report",
        content: "Here is the summary of defects and health status for today. Please review the critical blockers below.",
        time: "19:00",
        enabled: true
    };

    const dsrConfig = integrationData?.config || defaultConfig;

    return (
        <div className={styles.layout}>
            {/* Shared Sidebar Template */}
            <aside className={`${styles.sidebar} glass`}>
                <div className={styles.sidebarHeader}>
                    <img src="/logo.png" alt="AI Reporter Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                    <h2 style={{ fontSize: '1.4rem' }}>{role === 'admin' ? 'Admin Portal' : role === 'qa_lead' ? 'Lead Portal' : 'Tester Portal'}</h2>
                </div>

                <nav className={styles.sidebarNav}>
                    <Link href={role === 'admin' ? '/dashboard/admin' : role === 'qa_lead' ? '/dashboard/lead' : '/dashboard'} className={styles.navItem}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
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
                    <Link href="/dashboard/daily-status" className={`${styles.navItem} ${styles.active}`}>
                        <Mail size={20} />
                        <span>Daily Status Report</span>
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar} style={{ background: 'var(--primary-gradient)' }}>
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user.user_metadata?.full_name || 'User'}</span>
                            <span className={styles.userEmail} style={{ fontSize: '0.7rem' }}>{role.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.topbar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <MobileMenuToggle />
                        <h1>Daily Status Report Hub</h1>
                    </div>
                </header>

                <DSRClient initialConfig={dsrConfig} existingId={integrationData?.id || null} />
            </main>
        </div>
    );
}
