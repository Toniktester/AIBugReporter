'use client'

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function NotificationsClient() {
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [teamsAlerts, setTeamsAlerts] = useState(true);
    const [saved, setSaved] = useState(false);

    // Sync from local storage mock for persistence if needed
    useEffect(() => {
        const storedEmail = localStorage.getItem('emailAlerts');
        const storedTeams = localStorage.getItem('teamsAlerts');
        if (storedEmail !== null) setEmailAlerts(storedEmail === 'true');
        if (storedTeams !== null) setTeamsAlerts(storedTeams === 'true');
    }, []);

    const handleSave = () => {
        localStorage.setItem('emailAlerts', String(emailAlerts));
        localStorage.setItem('teamsAlerts', String(teamsAlerts));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    return (
        <form className={styles.form}>
            <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>Email Notifications</label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive a daily summary of reported bugs.</span>
                </div>
                <label className={styles.switch}>
                    <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                    <span className={styles.slider}></span>
                </label>
            </div>
             <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-primary)' }}>Critical Issue Alerts (Teams Only)</label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Immediate Microsoft Teams alert when a critical bug is logged.</span>
                </div>
                <label className={styles.switch}>
                    <input 
                        type="checkbox" 
                        checked={teamsAlerts} 
                        onChange={(e) => setTeamsAlerts(e.target.checked)} 
                    />
                    <span className={styles.slider}></span>
                </label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
                <button type="button" className={styles.primaryBtn} onClick={handleSave}>
                    Save Preferences
                </button>
                {saved && <span style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: 500 }}>Preferences active and saved!</span>}
            </div>
        </form>
    )
}
