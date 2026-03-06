import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { Bug, ArrowLeft, Clock, Monitor, Globe, ChevronRight, Activity, Terminal, PlayCircle } from 'lucide-react'
import BugActions from './BugActions'

export default async function BugDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: bug, error } = await supabase
        .from('bugs')
        .select(` *, reporter:reporter_id(full_name, email) `)
        .eq('id', id)
        .single()

    if (error || !bug) {
        notFound()
    }

    const env = bug.environment_info || {}

    return (
        <div className={styles.layout}>
            <header className={styles.topbar}>
                <div className={styles.headerLeft}>
                    <Link href="/bugs" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Back to Bugs
                    </Link>
                    <div className={styles.titleArea}>
                        <h1>{bug.summary}</h1>
                        <div className={styles.badges}>
                            <span className={`${styles.badge} ${styles['severity-' + bug.severity]}`}>
                                {bug.severity}
                            </span>
                            <span className={`${styles.badge} ${styles['status-' + bug.status]}`}>
                                {bug.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>
                <BugActions bugId={bug.id} initialStatus={bug.status} />
            </header>

            <div className={styles.dashboardGrid}>
                {/* Main Content Column */}
                <div className={styles.mainColumn}>

                    <section className={`${styles.card} glass`}>
                        <h2><Activity size={20} className="text-gradient" /> AI Generated Insights</h2>

                        <div className={styles.insightSection}>
                            <h3>Description</h3>
                            <p>{bug.description || 'No description provided.'}</p>
                        </div>

                        <div className={styles.insightSection}>
                            <h3>Steps to Reproduce</h3>
                            <div className={styles.codeBlock}>
                                <pre>{bug.steps_to_reproduce || 'Steps not available.'}</pre>
                            </div>
                        </div>

                        <div className={styles.splitInsights}>
                            <div className={styles.insightSection}>
                                <h3>Expected Result</h3>
                                <p>{bug.expected_result || 'N/A'}</p>
                            </div>
                            <div className={styles.insightSection}>
                                <h3>Actual Result</h3>
                                <p>{bug.actual_result || 'N/A'}</p>
                            </div>
                        </div>

                        <div className={styles.insightSection}>
                            <h3>Possible Root Cause (AI)</h3>
                            <div className={styles.rootCauseBox}>
                                <Bug size={16} /> {bug.root_cause || 'Analyzing...'}
                            </div>
                        </div>
                    </section>

                    <section className={`${styles.card} glass`}>
                        <h2><PlayCircle size={20} className="text-gradient" /> Developer Replay <span className={styles.betaTag}>BETA</span></h2>
                        <div className={styles.replayViewer}>
                            <div className={styles.replayPlaceholder}>
                                <PlayCircle size={48} className={styles.emptyIcon} />
                                <p>User Session Recording</p>
                                <span>Click to playback the DOM mutations recorded prior to the bug (Requires rrweb data).</span>
                                <button className={styles.outlineBtn} disabled>Play Recording</button>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Sidebar Column */}
                <div className={styles.sideColumn}>

                    <section className={`${styles.card} glass`}>
                        <h2>Details</h2>
                        <ul className={styles.metaList}>
                            <li>
                                <span className={styles.metaLabel}>Bug ID</span>
                                <span className={styles.metaValue} style={{ fontFamily: 'monospace' }}>{(bug.id as string).split('-')[0]}</span>
                            </li>
                            <li>
                                <span className={styles.metaLabel}>Reporter</span>
                                <span className={styles.metaValue}>{bug.reporter?.full_name || bug.reporter?.email || 'Unknown'}</span>
                            </li>
                            <li>
                                <span className={styles.metaLabel}>Created</span>
                                <span className={styles.metaValue}>{new Date(bug.created_at).toLocaleString()}</span>
                            </li>
                        </ul>
                    </section>

                    <section className={`${styles.card} glass`}>
                        <h2><Monitor size={20} className="text-gradient" /> Environment</h2>
                        <ul className={styles.metaList}>
                            <li>
                                <span className={styles.metaLabel}>URL</span>
                                <span className={styles.metaValue} title={env.url}>{env.url ? new URL(env.url).pathname : 'N/A'}</span>
                            </li>
                            <li>
                                <span className={styles.metaLabel}>Resolution</span>
                                <span className={styles.metaValue}>{env.resolution || 'N/A'}</span>
                            </li>
                            <li>
                                <span className={styles.metaLabel}>Browser</span>
                                <span className={styles.metaValue} title={env.userAgent}>
                                    {env.userAgent ? (env.userAgent.includes('Chrome') ? 'Chrome' : 'Other') : 'N/A'}
                                </span>
                            </li>
                        </ul>
                    </section>

                    <section className={`${styles.card} glass`}>
                        <h2><Terminal size={20} className="text-gradient" /> Console Logs</h2>
                        {bug.console_logs && bug.console_logs.length > 0 ? (
                            <div className={styles.logViewer}>
                                {bug.console_logs.map((log: any, i: number) => (
                                    <div key={i} className={`${styles.logEntry} ${styles['log-' + log.type]}`}>
                                        <span className={styles.logTime}>{new Date(log.time).toLocaleTimeString()}</span>
                                        <span className={styles.logMsg}>{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyText}>No console errors captured.</p>
                        )}
                    </section>

                </div>
            </div>
        </div>
    )
}
