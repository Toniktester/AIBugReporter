import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { ArrowLeft, Key, Settings as SettingsIcon, Bell, Shield, Database } from 'lucide-react'
import IntegrationsClient from './IntegrationsClient'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: projects } = await supabase.from('projects').select('id, name').limit(1)
    const projectId = projects?.[0]?.id;

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
                        <a href="#general" className={`${styles.navItem} ${styles.active}`}>
                            <SettingsIcon size={18} /> General
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

                    <section id="general" className={`${styles.card} glass`}>
                        <h2>General Settings</h2>
                        <form className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Project Name</label>
                                <input type="text" defaultValue={projects?.[0]?.name || "Demo Project"} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Project ID (For Extension)</label>
                                <div className={styles.inputWithIcon}>
                                    <Key size={16} className={styles.inputIcon} />
                                    <input type="text" readOnly value={projectId || ''} className={styles.readOnly} />
                                </div>
                            </div>
                            <button type="button" className={styles.primaryBtn}>Save Changes</button>
                        </form>
                    </section>

                    <section id="integrations" className={`${styles.card} glass`}>
                        <h2>Integrations & Webhooks</h2>
                        <p className={styles.description}>Connect your project to external issue trackers or chat applications.</p>

                        <IntegrationsClient projectId={projectId} />
                    </section>

                    <section id="notifications" className={`${styles.card} glass`}>
                        <h2>Notification Preferences</h2>
                        <form className={styles.form}>
                            <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>Email Notifications</label>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive a daily summary of reported bugs.</span>
                                </div>
                                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                            </div>
                            <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>Critical Issue Alerts</label>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Immediate email when a critical bug is logged.</span>
                                </div>
                                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
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
