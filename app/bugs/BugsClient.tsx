'use client';

import React, { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import styles from './page.module.css';

export default function BugsClient({ allBugs, domain }: { allBugs: any[], domain: string }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredBugs = allBugs ? allBugs.filter(bug => {
        const query = searchQuery.toLowerCase();
        return (
            bug.summary?.toLowerCase().includes(query) ||
            bug.id?.toLowerCase().includes(query) ||
            bug.status?.toLowerCase().includes(query) ||
            bug.severity?.toLowerCase().includes(query)
        );
    }) : [];

    return (
        <div style={{ width: '100%' }}>
            {/* Search Box */}
            <div className={`glass`} style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)' }}>
                <Search size={20} color="var(--text-muted)" />
                <input 
                    type="text" 
                    placeholder="Search by summary, status, priority, or bug ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.input} 
                    style={{ flex: 1, height: '40px', background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '1rem' }} 
                />
            </div>

            {/* Bugs Table with Responsive wrapper */}
            <div className={styles.tableContainer} style={{ overflowX: 'auto', width: '100%', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                <table className={styles.table} style={{ minWidth: '800px', width: '100%' }}>
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
                        {filteredBugs && filteredBugs.map((bug: any) => (
                            <tr key={bug.id}>
                                <td className={styles.idCell}>
                                    <a href={`https://${domain}.atlassian.net/browse/${bug.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)' }}>
                                        {bug.id}
                                    </a>
                                </td>
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
                                    <a href={`https://${domain}.atlassian.net/browse/${bug.id}`} target="_blank" rel="noopener noreferrer" className={styles.viewBtn}>
                                        View Details <ChevronRight size={16} />
                                    </a>
                                </td>
                            </tr>
                        ))}

                        {(!filteredBugs || filteredBugs.length === 0) && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No bugs found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
