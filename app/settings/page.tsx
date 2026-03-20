import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { ArrowLeft, Key, Settings as SettingsIcon, Bell, Shield, Database } from 'lucide-react'
import IntegrationsClient from './IntegrationsClient'
import ProjectsClient from './ProjectsClient'

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
                        <a href="#projects" className={`${styles.navItem} ${styles.active}`}>
                            <SettingsIcon size={18} /> Projects
                        </a>
                        <a href="#integrations" className={styles.navItem}>
                            <Database size={18} /> Integrations & APIs
                        </a>
                        <a href="#notifications" className={styles.navItem}>
                            <Bell size={18} /> Notifications
                        </a>
                        <a href="#security" className={styles.navItem}>
                            <Shield size={18} /> Security
                        </a>
                    </nav>
                </div>

                <div className={styles.mainContent}>

                    <section id="projects" className={`${styles.card} glass`}>
                        <h2>Project Management</h2>
                        <p className={styles.description}>Create and manage distinct projects to organize your defect tracking.</p>
                        <ProjectsClient />
                    </section>

                    <section id="integrations" className={`${styles.card} glass`}>
                        <h2>Integrations & Webhooks</h2>
                        <p className={styles.description}>Connect your project to external issue trackers or chat applications.</p>

                        <IntegrationsClient projects={projects || []} />
                    </section>

                    <section id="notifications" className={`${styles.card} glass`}>
                        <h2>Notification Preferences</h2>
                        <form className={styles.form}>
                            <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>Email Notifications</label>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive a daily summary of reported bugs.</span>
                                </div>
                                <label className={styles.switch}>
                                    <input type="checkbox" defaultChecked />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                             <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>Critical Issue Alerts (Teams Only)</label>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Immediate Microsoft Teams alert when a critical bug is logged. Email is disabled for high-priority noise reduction.</span>
                                </div>
                                <label className={`${styles.switch} ${styles.disabled}`}>
                                    <input type="checkbox" checked readOnly />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                            <button type="button" className={styles.primaryBtn} style={{ marginTop: '1.5rem' }}>Save Preferences</button>
                        </form>
                    </section>

                    <section id="security" className={`${styles.card} glass`}>
                        <h2>Security</h2>
                        <div className={styles.form}>
                            <div className={styles.formGroup}>
                                <label style={{ color: '#fca5a5' }}>Danger Zone</label>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Irreversibly delete this project and all its associated bug reports, logs, and attachments.</p>
                            </div>
                            <button type="button" className={styles.outlineBtn} style={{ borderColor: '#ef4444', color: '#fca5a5', alignSelf: 'flex-start' }}>Delete Project</button>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    )
}
