'use client'

import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts'
import styles from './page.module.css'

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6'
};

const STATUS_COLORS: Record<string, string> = {
    open: '#3b82f6',
    in_progress: '#f59e0b',
    resolved: '#10b981',
    closed: '#6b7280'
};

export default function DashboardCharts({ bugs }: { bugs: any[] }) {
    if (!bugs || bugs.length === 0) {
        return <p>Loading analytics...</p>
    }

    // 1. Bugs by Severity
    const severityCount = bugs.reduce((acc, bug) => {
        acc[bug.severity] = (acc[bug.severity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const severityData = Object.keys(severityCount).map(k => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: severityCount[k], color: SEVERITY_COLORS[k] || '#ccc' }));

    // 2. Bugs by Status
    const statusCount = bugs.reduce((acc, bug) => {
        acc[bug.status] = (acc[bug.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const statusData = Object.keys(statusCount).map(k => ({ name: k.replace('_', ' ').toUpperCase(), value: statusCount[k], color: STATUS_COLORS[k] || '#ccc' }));

    // 3. Weekly Trends (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const trendData = last7Days.map(dateStr => {
        const count = bugs.filter(b => b.created_at.startsWith(dateStr)).length;
        // Format date strictly as DD/MM for short display
        const [yyyy, mm, dd] = dateStr.split('-');
        return { date: `${mm}/${dd}`, count };
    });

    return (
        <div className={styles.chartsGrid}>
            <div className={`${styles.chartCard} glass`}>
                <h3>Bugs by Severity</h3>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={5}>
                                {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ background: '#1e1e2d', border: 'none', borderRadius: '8px' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`${styles.chartCard} glass`}>
                <h3>Bugs by Status</h3>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <BarChart data={statusData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                            <XAxis type="number" stroke="#6b7280" />
                            <YAxis dataKey="name" type="category" stroke="#6b7280" width={80} />
                            <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e1e2d', border: 'none', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`${styles.chartCard} glass`} style={{ gridColumn: '1 / -1' }}>
                <h3>Weekly Defect Trend</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" allowDecimals={false} />
                            <RechartsTooltip contentStyle={{ background: '#1e1e2d', border: 'none', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="count" stroke="var(--primary-color)" strokeWidth={3} dot={{ r: 5, fill: 'var(--primary-color)' }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
