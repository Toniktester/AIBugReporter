import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { Bug, ArrowLeft, Clock, AlertTriangle, Monitor, Globe, ChevronRight } from 'lucide-react'

export default async function BugsListPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch bugs from db
    const { data: bugs, error } = await supabase
        .from('bugs')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className={styles.layout}>
            <header className={styles.topbar}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Dashboard
                    </Link>
                    <h1>All Bug Reports</h1>
                </div>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Bug ID</th>
                            <th>Summary</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Reported At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bugs && bugs.map((bug: any) => (
                            <tr key={bug.id}>
                                <td className={styles.idCell}>#{bug.id.split('-')[0]}</td>
                                <td className={styles.summaryCell}>{bug.summary}</td>
                                <td>
                                    <span className={`${styles.badge} ${styles['severity-' + bug.severity]}`}>
                                        {bug.severity}
                                    </span>
                                </td>
                                <td>
                                    <span className={`${styles.badge} ${styles['status-' + bug.status]}`}>
                                        {bug.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className={styles.dateCell}>
                                    {new Date(bug.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                    <Link href={`/bugs/${bug.id}`} className={styles.viewBtn}>
                                        View Details <ChevronRight size={16} />
                                    </Link>
                                </td>
                            </tr>
                        ))}

                        {(!bugs || bugs.length === 0) && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No bugs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
