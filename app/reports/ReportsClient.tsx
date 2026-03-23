'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import { Download, FileText, Mail, Filter, AlertTriangle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

const SEVERITY_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6' };
const STATUS_COLORS: Record<string, string> = { open: '#3b82f6', in_progress: '#f59e0b', resolved: '#10b981', closed: '#6b7280' };

export default function ReportsClient({ bugs }: { bugs: any[] }) {
    const [statusFilter, setStatusFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [emailing, setEmailing] = useState(false);
    const [emailModal, setEmailModal] = useState('kneelamegam@tonikbank.com');

    const filteredBugs = useMemo(() => {
        let res = bugs || [];
        if (statusFilter !== 'all') res = res.filter(b => b.status === statusFilter);
        if (severityFilter !== 'all') res = res.filter(b => b.severity === severityFilter);
        if (dateRange !== 'all') {
            const today = new Date();
            const daysToSubtract = parseInt(dateRange, 10);
            today.setDate(today.getDate() - daysToSubtract);
            res = res.filter(b => new Date(b.created_at) >= today);
        }
        return res;
    }, [bugs, statusFilter, severityFilter, dateRange]);

    // Analytics Metrics
    const totalCount = filteredBugs.length;
    const criticalCount = filteredBugs.filter(b => b.severity === 'critical' || b.severity === 'high').length;
    const resolvedCount = filteredBugs.filter(b => b.status === 'resolved' || b.status === 'closed').length;
    const resolutionRate = totalCount ? Math.round((resolvedCount / totalCount) * 100) : 0;

    // Chart Data
    const statusData = Object.entries(filteredBugs.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {} as Record<string, number>))
        .map(([k, v]) => ({ name: k.toUpperCase(), value: v, color: STATUS_COLORS[k] || '#ccc' }));

    const severityData = Object.entries(filteredBugs.reduce((acc, b) => { acc[b.severity] = (acc[b.severity] || 0) + 1; return acc; }, {} as Record<string, number>))
        .map(([k, v]) => ({ name: k.toUpperCase(), value: v, color: SEVERITY_COLORS[k] || '#ccc' }));

    const trendData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredBugs.forEach(b => {
            const dateStr = b.created_at.split('T')[0];
            counts[dateStr] = (counts[dateStr] || 0) + 1;
        });
        return Object.entries(counts).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => {
            const [y,m,d] = k.split('-');
            return { date: `${m}/${d}`, raw: k, count: v };
        });
    }, [filteredBugs]);

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredBugs.map((b: any) => ({
            'Bug ID': b.id,
            'Summary': b.summary,
            'Severity': b.severity.toUpperCase(),
            'Status': b.status.toUpperCase(),
            'Date Created': new Date(b.created_at).toLocaleString()
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Bugs");
        XLSX.writeFile(workbook, `Defect_Report_${new Date().getTime()}.xlsx`);
    };

    const handleExportPDF = () => {
        window.print();
    };

    const handleEmailReport = async () => {
        if (!emailModal || !emailModal.includes('@')) {
            alert("Please enter a valid email address!");
            return;
        }
        
        let reportText = `System Defect Report\nTotal Defects: ${totalCount}\nCritical/High Action Items: ${criticalCount}\nResolution Rate: ${resolutionRate}%\n\nDetails:\n`;
        filteredBugs.slice(0, 50).forEach((b: any) => {
            reportText += `[${b.id}] ${b.summary} - Priority: ${b.severity} - Status: ${b.status}\n`;
        });
        
        const mailtoLink = `mailto:${encodeURIComponent(emailModal)}?subject=${encodeURIComponent(`Tonik Defect Report - ${totalCount} Bugs`)}&body=${encodeURIComponent(reportText)}`;
        window.location.href = mailtoLink;
        
        setEmailModal('kneelamegam@tonikbank.com');
    };

    return (
        <div className={styles.dashboardContainer} style={{ width: '100%', paddingBottom: '2rem' }}>
            <style jsx global>{`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    aside, .print-hide { display: none !important; }
                    body, html { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
                    div[class*="layout"] { padding: 0 !important; display: block !important; margin: 0 !important; max-width: 100% !important; }
                    .${styles.dashboardContainer} { padding: 0 !important; width: 100% !important; margin: 0 !important; display: block !important; }
                    main { width: 100% !important; margin: 0 !important; padding: 0 !important; display: block !important; }
                    .glass { background: none !important; border: 1px solid #ccc !important; box-shadow: none !important; color: black !important; }
                    text { fill: black !important; }
                    .${styles.chartsGrid} { display: flex !important; flex-direction: column !important; }
                    .${styles.chartCard} { width: 100% !important; page-break-inside: avoid; margin-bottom: 20px !important; }
                    .${styles.statsGrid} { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; }
                    .${styles.statCard} { flex: 1 !important; min-width: 200px !important; page-break-inside: avoid; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            `}</style>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="/dashboard" className={styles.backBtn} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text-muted)' }}>
                        <ArrowLeft size={20} /> Dashboard
                    </a>
                    <div>
                        <h1 style={{ margin: 0 }}>System Defect Analytics</h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '4px' }}>Real-time aggregated view of platform health.</p>
                    </div>
                </div>
                <div className="print-hide" style={{ display: 'flex', gap: '0.8rem' }}>
                    <button onClick={handleExportExcel} className={styles.primaryBtn} style={{ background: '#10b981', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={handleExportPDF} className={styles.primaryBtn} style={{ background: '#ef4444', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <FileText size={16} /> PDF
                    </button>
                </div>
            </header>

            {/* Email Inline Target */}
            <div className={`print-hide glass`} style={{ padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                <Mail size={20} color="var(--primary-color)" />
                <input type="email" value={emailModal} onChange={e => setEmailModal(e.target.value)} placeholder="Recipient Email (e.g. lead@tonik.com)" className={styles.input} style={{ flex: 1, height: '40px' }} />
                <button onClick={handleEmailReport} disabled={emailing} className={styles.primaryBtn} style={{ height: '40px' }}>
                    {emailing ? 'Sending...' : 'Dispatch Report'}
                </button>
            </div>

            {/* Filters */}
            <div className={`print-hide glass`} style={{ padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <Filter size={18} /> <strong>Filters:</strong>
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={styles.select} style={{ width: '160px' }}>
                    <option value="all">Every Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className={styles.select} style={{ width: '160px' }}>
                    <option value="all">Every Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} className={styles.select} style={{ width: '160px' }}>
                    <option value="all">All Time</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                </select>
            </div>

            {/* Key Metrics */}
            <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
                <div className={`glass ${styles.statCard}`}>
                    <h3><AlertTriangle size={18} color="var(--primary-color)"/> Total Defects</h3>
                    <div className={styles.statValue}>{totalCount}</div>
                    <p className={styles.statLabel}>Matching current filters</p>
                </div>
                <div className={`glass ${styles.statCard}`}>
                    <h3><AlertTriangle size={18} color="var(--danger-color)"/> Critical Focus</h3>
                    <div className={`${styles.statValue} ${styles.danger}`}>{criticalCount}</div>
                    <p className={styles.statLabel}>High priority action needed</p>
                </div>
                <div className={`glass ${styles.statCard}`}>
                    <h3><CheckCircle size={18} color="var(--success-color)"/> Resolved</h3>
                    <div className={`${styles.statValue} ${styles.success}`}>{resolvedCount}</div>
                    <p className={styles.statLabel}>Completed objectives</p>
                </div>
                <div className={`glass ${styles.statCard}`}>
                    <h3><Clock size={18} color="#a855f7"/> Resolution Rate</h3>
                    <div className={styles.statValue} style={{ color: '#a855f7' }}>{resolutionRate}%</div>
                    <p className={styles.statLabel}>Performance indicator</p>
                </div>
            </div>

            {/* Charts Area */}
            <div className={styles.chartsGrid} style={{ marginBottom: '2rem' }}>
                <div className={`glass ${styles.chartCard}`}>
                    <h3>Issue Breakdown by Priority</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                                    {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{ background: '#1e1e2d', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className={`glass ${styles.chartCard}`}>
                    <h3>Status Distribution</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <BarChart data={statusData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <XAxis type="number" stroke="#6b7280" />
                                <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e1e2d', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className={`glass ${styles.chartCard}`} style={{ gridColumn: '1 / -1' }}>
                    <h3>Reported Issues Timeline</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={trendData} margin={{ left: 0, right: 30, top: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="date" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" allowDecimals={false} />
                                <RechartsTooltip contentStyle={{ background: '#1e1e2d', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Line type="monotone" dataKey="count" stroke="var(--primary-color)" strokeWidth={3} dot={{ fill: 'var(--primary-color)', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Data Drill-down */}
            <div className={`glass`} style={{ padding: '1.5rem', borderRadius: '16px', overflowX: 'auto' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} className="text-gradient" /> Detailed Bug Payload
                </h2>
                <table className={styles.table} style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th>Jira ID</th>
                            <th>Summary</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Logged Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBugs.slice(0, 30).map((b: any) => (
                            <tr key={b.id}>
                                <td><a href={`https://${b.project_id ? 'toniktester' : 'toniktester'}.atlassian.net/browse/${b.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>{b.id}</a></td>
                                <td>{b.summary.length > 60 ? b.summary.substring(0, 60) + '...' : b.summary}</td>
                                <td><span className={`${styles.badge} ${styles['severity-' + b.severity]}`}>{b.severity.toUpperCase()}</span></td>
                                <td><span className={`${styles.badge} ${styles['status-' + b.status]}`}>{b.status.toUpperCase()}</span></td>
                                <td>{new Date(b.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredBugs.length > 30 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Showing top 30 filtered records. Use the Excel export to view all {filteredBugs.length} rows.
                    </div>
                )}
                {filteredBugs.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No defects match the selected filters.</div>
                )}
            </div>
        </div>
    );
}
