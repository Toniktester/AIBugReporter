import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { ArrowLeft, Download, BarChart2, PieChart, Activity } from 'lucide-react'

export default async function ReportsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch bugs for reporting
    const { data: bugs, error } = await supabase
        .from('bugs')
        .select('severity, status, created_at')

    const totalBugs = bugs?.length || 0;

    // Aggregate stats
    const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    const statusCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };

    if (bugs) {
        bugs.forEach(bug => {
            if (severityCounts[bug.severity as keyof typeof severityCounts] !== undefined) {
                severityCounts[bug.severity as keyof typeof severityCounts]++;
            }
            const safeStatus = bug.status.replace('-', '_');
            if (statusCounts[safeStatus as keyof typeof statusCounts] !== undefined) {
                statusCounts[safeStatus as keyof typeof statusCounts]++;
            }
        });
    }

    return (
        <div className={styles.layout}>
            <header className={styles.topbar}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Dashboard
                    </Link>
                    <h1>Analytics & Reports</h1>
                </div>
                <div className={styles.actions}>
                    {/* The export functionality will be handled via an API route or client side component.
                For now, linking to a hypothetical CSV download endpoint. */}
                    <a href="/api/reports/export-csv" target="_blank" className={styles.primaryBtn}>
                        <Download size={18} /> Export as CSV
                    </a>
                </div>
            </header>

            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} glass`}>
                    <h3>Total Bugs</h3>
                    <div className={styles.statValue}>{totalBugs}</div>
                    <p className={styles.statLabel}>Recorded across all time</p>
                </div>
                <div className={`${styles.statCard} glass`}>
                    <h3>Critical Issues</h3>
                    <div className={`${styles.statValue} ${styles.danger}`}>{severityCounts.critical}</div>
                    <p className={styles.statLabel}>Requires immediate attention</p>
                </div>
                <div className={`${styles.statCard} glass`}>
                    <h3>Resolved</h3>
                    <div className={`${styles.statValue} ${styles.success}`}>{statusCounts.resolved + statusCounts.closed}</div>
                    <p className={styles.statLabel}>Closed/Resolved status</p>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={`${styles.chartCard} glass`}>
                    <div className={styles.chartHeader}>
                        <PieChart size={20} className="text-gradient" />
                        <h2>Severity Breakdown</h2>
                    </div>
                    <div className={styles.metricList}>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#fca5a5' }}></span>
                            <span className={styles.metricName}>Critical</span>
                            <span className={styles.metricCount}>{severityCounts.critical}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#fdba74' }}></span>
                            <span className={styles.metricName}>High</span>
                            <span className={styles.metricCount}>{severityCounts.high}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#fde047' }}></span>
                            <span className={styles.metricName}>Medium</span>
                            <span className={styles.metricCount}>{severityCounts.medium}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#4ade80' }}></span>
                            <span className={styles.metricName}>Low</span>
                            <span className={styles.metricCount}>{severityCounts.low}</span>
                        </div>
                    </div>
                </div>

                <div className={`${styles.chartCard} glass`}>
                    <div className={styles.chartHeader}>
                        <Activity size={20} className="text-gradient" />
                        <h2>Status Distribution</h2>
                    </div>
                    <div className={styles.metricList}>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#93c5fd' }}></span>
                            <span className={styles.metricName}>Open</span>
                            <span className={styles.metricCount}>{statusCounts.open}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#d8b4fe' }}></span>
                            <span className={styles.metricName}>In Progress</span>
                            <span className={styles.metricCount}>{statusCounts.in_progress}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#86efac' }}></span>
                            <span className={styles.metricName}>Resolved</span>
                            <span className={styles.metricCount}>{statusCounts.resolved}</span>
                        </div>
                        <div className={styles.metricItem}>
                            <span className={styles.metricDot} style={{ background: '#d1d5db' }}></span>
                            <span className={styles.metricName}>Closed</span>
                            <span className={styles.metricCount}>{statusCounts.closed}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
