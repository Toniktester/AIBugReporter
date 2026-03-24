'use client';

import { useState } from 'react';
import { Save, Send, Clock, Mail, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import styles from '@/app/bugs/new/page.module.css';

export default function DSRClient({ initialConfig, existingId }: { initialConfig: any, existingId: string | null }) {
    const [config, setConfig] = useState(initialConfig);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setMsg({ type: '', text: '' });
        
        try {
            const res = await fetch('/api/dsr/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: existingId, config })
            });
            const data = await res.json();
            if (res.ok) setMsg({ type: 'success', text: 'Daily Status Report Configuration Saved!' });
            else setMsg({ type: 'error', text: data.error || 'Failed to save configuration.' });
        } catch (e: any) {
            setMsg({ type: 'error', text: e.message || 'Network error occurred.' });
        }
        setLoading(false);
    };

    const handleTestEmail = async () => {
        setSending(true); setMsg({ type: '', text: '' });
        try {
            const res = await fetch('/api/dsr/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Use current config rather than DB config for test dispatch
                body: JSON.stringify({ configOverride: config })
            });
            const data = await res.json();
            if (res.ok) setMsg({ type: 'success', text: 'Test Status Report Sent Successfully via Resend!' });
            else setMsg({ type: 'error', text: data.error || 'Failed to send email.' });
        } catch (e: any) {
            setMsg({ type: 'error', text: e.message });
        }
        setSending(false);
    };

    return (
        <div className="glass" style={{ padding: '2.5rem', borderRadius: '16px' }}>
            {msg.text && (
                <div className={msg.type === 'error' ? styles.errorBanner : styles.successBanner} style={{ marginBottom: '2rem' }}>
                    {msg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSave} className={styles.formContainer}>
                
                {/* Activation Logic */}
                <div className={styles.teamsToggleRow} style={{ marginBottom: '1rem', background: 'rgba(99, 102, 241, 0.1)' }}>
                    <div className={styles.teamsToggleInfo}>
                        <Clock size={24} className={styles.teamsIcon} style={{ color: 'var(--primary-color)' }} />
                        <div>
                            <span className={styles.teamsLabel}>Automated Dispatch Engine</span>
                            <span className={styles.teamsSubLabel}>Send beautifully formatted daily emails directly to stakeholders.</span>
                        </div>
                    </div>
                    <label className={styles.switch}>
                        <input type="checkbox" checked={config.enabled} onChange={e => setConfig({...config, enabled: e.target.checked})} />
                        <span className={styles.slider}></span>
                    </label>
                </div>

                <div className={styles.grid3}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}><Clock size={14} /> Scheduled Time</label>
                        <input type="time" value={config.time} onChange={e => setConfig({...config, time: e.target.value})} className={styles.input} required />
                        <span className={styles.hint}>Local system time for Cron execution.</span>
                    </div>
                </div>

                {/* Recipient Logic */}
                <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                    <label className={styles.label}><Users size={14} /> To Receipients <span className={styles.required}>*</span></label>
                    <input type="text" value={config.to} onChange={e => setConfig({...config, to: e.target.value})} placeholder="project.manager@example.com, tech.lead@tonik.com" className={styles.input} required />
                    <span className={styles.hint}>Comma separated email addressing.</span>
                </div>

                <div className={styles.grid2}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>CC Elements <span className={styles.optional}>(Optional)</span></label>
                        <input type="text" value={config.cc} onChange={e => setConfig({...config, cc: e.target.value})} className={styles.input} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>BCC Elements <span className={styles.optional}>(Optional)</span></label>
                        <input type="text" value={config.bcc} onChange={e => setConfig({...config, bcc: e.target.value})} className={styles.input} />
                    </div>
                </div>

                {/* Email Body */}
                <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                    <label className={styles.label}><Mail size={14} /> Custom Report Subject</label>
                    <input type="text" value={config.subject} onChange={e => setConfig({...config, subject: e.target.value})} className={styles.input} required />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Custom Report Prologue HTML</label>
                    <textarea value={config.content} onChange={e => setConfig({...config, content: e.target.value})} className={styles.textarea} rows={3} placeholder="Insert any custom messaging to preface the automated Jira Data Payload..."></textarea>
                    <span className={styles.hint}>The automated charts, Jira bug tables, and severity reports will be seamlessly attached directly below this content.</span>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2.5rem' }}>
                    <button type="submit" className={styles.submitBtn} disabled={loading} style={{ flex: 1 }}>
                        <Save size={18} /> {loading ? 'Saving...' : 'Save Configuration'}
                    </button>
                    
                    <button type="button" onClick={handleTestEmail} disabled={sending} className={styles.submitBtn} style={{ flex: 1, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid #4ade80', boxShadow: 'none' }}>
                        <Send size={18} /> {sending ? 'Dispatching Test Email...' : 'Trigger Send Now (Resend API)'}
                    </button>
                </div>
            </form>
        </div>
    );
}
