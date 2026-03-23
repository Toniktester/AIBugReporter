import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { ArrowLeft, Key, Settings as SettingsIcon, Bell, Shield, Database } from 'lucide-react'
import IntegrationsClient from './IntegrationsClient'
import ProjectsClient from './ProjectsClient'
import NotificationsClient from './NotificationsClient'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'admin@tonik.com') {
        redirect('/dashboard');
    }

    const { data: projects } = await supabase.from('projects').select('id, name').order('name');

    return (
        <div className={styles.layout}>
            <header className={styles.topbar}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Dashboard
                    </Link>
                    <h1>Project Settings</h1>
                </div>
            </header>

            <div className={styles.settingsContainer}>

                <div className={styles.sidebar}>
                    <nav className={styles.navMenu}>
                        <a href="#integrations" className={styles.navItem}>
                            <Database size={18} /> Integrations & APIs
                        </a>
                        <a href="#notifications" className={styles.navItem}>
                            <Bell size={18} /> Notifications
                        </a>
                    </nav>
                </div>

                <div className={styles.mainContent}>

                    <section id="integrations" className={`${styles.card} glass`}>
                        <h2>Integrations & Webhooks</h2>
                        <p className={styles.description}>Connect your project to external issue trackers or chat applications.</p>

                        <IntegrationsClient projects={projects || []} />
                    </section>

                    <section id="notifications" className={`${styles.card} glass`}>
                        <h2>Notification Preferences</h2>
                        <NotificationsClient />
                    </section>

                </div>
            </div>
        </div>
    )
}
