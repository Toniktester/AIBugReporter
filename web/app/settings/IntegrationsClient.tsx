'use client'

import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import styles from './page.module.css'

export default function IntegrationsClient({ projectId }: { projectId: string }) {
    const [integrations, setIntegrations] = useState<Record<string, any>>({})
    const [editing, setEditing] = useState<string | null>(null)
    const [configValues, setConfigValues] = useState<any>({})
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchIntegrations()
    }, [])

    const fetchIntegrations = async () => {
        try {
            const res = await fetch(`/api/integrations?projectId=${projectId}`)
            if (res.ok) {
                const data = await res.json()
                const mapping: Record<string, any> = {}
                data.integrations.forEach((intg: any) => {
                    mapping[intg.provider] = intg.config
                })
                setIntegrations(mapping)
            }
        } catch (error) {
            console.error('Failed to fetch integrations', error)
        }
    }

    const handleSave = async (provider: string) => {
        setLoading(true)
        setMessage('')
        try {
            const res = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, provider, config: configValues })
            })
            if (res.ok) {
                setIntegrations(prev => ({ ...prev, [provider]: configValues }))
                setEditing(null)
                setMessage(`${provider} connected successfully!`)
            } else {
                setMessage(`Failed to connect ${provider}`)
            }
        } catch (error) {
            setMessage('An error occurred during save.')
        } finally {
            setLoading(false)
        }
    }

    const IntegrationCard = ({ id, name, desc, color, short }: { id: string, name: string, desc: string, color: string, short: string }) => {
        const isConnected = !!integrations[id]
        const isEditing = editing === id

        const handleEditClick = () => {
            if (isEditing) {
                setEditing(null)
            } else {
                setEditing(id)
                if (id === 'jira') {
                    setConfigValues(integrations[id] || { domain: '', email: '', apiToken: '', projectKey: '' })
                } else {
                    setConfigValues(integrations[id] || { webhook_url: '' })
                }
            }
        }

        return (
            <div className={styles.integrationItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={styles.integrationInfo}>
                        <div className={styles.integrationIcon} style={{ background: color }}>{short}</div>
                        <div>
                            <h3>{name} {isConnected && <span style={{ fontSize: '0.7rem', color: '#4ade80', marginLeft: '0.5rem' }}>● Connected</span>}</h3>
                            <p>{desc}</p>
                        </div>
                    </div>
                    <button
                        className={styles.outlineBtn}
                        onClick={handleEditClick}
                    >
                        {isEditing ? 'Cancel' : (isConnected ? 'Configure' : 'Connect')}
                    </button>
                </div>

                {isEditing && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>

                        {id === 'jira' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Jira Domain (e.g. yourcompany)</label>
                                    <input type="text" value={configValues.domain || ''} onChange={(e) => setConfigValues({ ...configValues, domain: e.target.value })} placeholder="yourcompany" className={styles.input} style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Atlassian Email</label>
                                    <input type="email" value={configValues.email || ''} onChange={(e) => setConfigValues({ ...configValues, email: e.target.value })} placeholder="user@company.com" className={styles.input} style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Jira API Token</label>
                                    <input type="password" value={configValues.apiToken || ''} onChange={(e) => setConfigValues({ ...configValues, apiToken: e.target.value })} placeholder="Base64 encoded or raw token" className={styles.input} style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Default Project Key (e.g. PROJ)</label>
                                    <input type="text" value={configValues.projectKey || ''} onChange={(e) => setConfigValues({ ...configValues, projectKey: e.target.value })} placeholder="PROJ" className={styles.input} style={{ width: '100%' }} />
                                </div>
                                <button className={styles.primaryBtn} onClick={() => handleSave(id)} disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                                    Save Jira Config
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Webhook URL / API Endpoint
                                </label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        value={configValues.webhook_url || ''}
                                        onChange={(e) => setConfigValues({ webhook_url: e.target.value })}
                                        placeholder={`Enter ${name} webhook URL...`}
                                        style={{ flexGrow: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '0.25rem' }}
                                    />
                                    <button
                                        className={styles.primaryBtn}
                                        onClick={() => handleSave(id)}
                                        disabled={loading}
                                        style={{ padding: '0.5rem 1rem' }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={styles.integrationList}>
            {message && <div style={{ marginBottom: '1rem', color: '#6366f1', fontSize: '0.9rem' }}>{message}</div>}

            <IntegrationCard id="jira" name="Jira Software" desc="Create Jira issues automatically when bugs are reported. Attach screenshot natively." color="#0052CC" short="JRA" />
            <IntegrationCard id="teams" name="Microsoft Teams" desc="Post error cards to a Teams channel whenever a bug is logged." color="#6264A7" short="TMS" />
            <IntegrationCard id="outlook" name="Microsoft Outlook" desc="Send actionable emails using an Outlook Power Automate Webhook." color="#0078D4" short="OUT" />
            <IntegrationCard id="azure" name="Azure DevOps" desc="Sync bugs to Azure DevOps Boards." color="#0078D7" short="AZ" />
            <IntegrationCard id="slack" name="Slack Webhook" desc="Post notifications to a Slack channel." color="#E01E5A" short="SLA" />
        </div>
    )
}
