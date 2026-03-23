'use client'

import { useState, useRef, DragEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import {
    AlertTriangle, Send, UploadCloud, Sparkles, X,
    CheckCircle2, Tag, Calendar, GitBranch, Package,
    Users, BellRing, Cpu
} from 'lucide-react'

interface Project { id: string; name: string }
interface User { id: string; full_name: string; email: string }

export default function FormClient({ projects }: { projects: Project[] }) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Core fields
    const [projectId, setProjectId] = useState(projects[0]?.id || '')
    const [summary, setSummary] = useState('')
    const [description, setDescription] = useState('')
    const [steps, setSteps] = useState('')
    const [expected, setExpected] = useState('')
    const [actual, setActual] = useState('')
    const [severity, setSeverity] = useState('medium')
    const [jiraStoryId, setJiraStoryId] = useState('')

    // New fields
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(todayStr)
    const [dueDate, setDueDate] = useState(threeDaysStr)
    const [fixVersion, setFixVersion] = useState('')
    const [releaseVersion, setReleaseVersion] = useState('')
    const [labels, setLabels] = useState<string[]>([])
    const [labelInput, setLabelInput] = useState('')
    const [assignedTo, setAssignedTo] = useState('')
    const [users, setUsers] = useState<User[]>([])

    // Teams toggle
    const [postInTeams, setPostInTeams] = useState(false)

    // Screenshot
    const [imageBase64, setImageBase64] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    // UI state
    const [analyzing, setAnalyzing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        fetch('/api/admin/users-list')
            .then(r => r.ok ? r.json() : { users: [] })
            .then(d => setUsers(d.users || []))
            .catch(() => {})
    }, [])

    const handleImageUpload = (file: File) => {
        if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
        if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB.'); return; }
        const reader = new FileReader()
        reader.onloadend = () => setImageBase64(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleAIGenerate = async () => {
        if (!summary.trim() && !imageBase64) {
            setError('Please enter a bug summary or upload a screenshot for AI to analyze.')
            return
        }
        setAnalyzing(true); setError('')
        try {
            let endpoint = '/api/ai/generate-text-bug'
            let body: any = { summary }

            if (imageBase64) {
                endpoint = '/api/ai/analyze-screenshot'
                body = { imageBase64, summary }
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()

            if (res.ok && data.ai_data) {
                const ai = data.ai_data
                if (ai.summary && !summary) setSummary(ai.summary)
                if (ai.description) setDescription(ai.description)
                if (ai.steps_to_reproduce) setSteps(ai.steps_to_reproduce)
                if (ai.expected_result) setExpected(ai.expected_result)
                if (ai.actual_result) setActual(ai.actual_result)
                if (ai.severity) setSeverity(ai.severity.toLowerCase())
            } else {
                let msg = data.error?.message;
                if (!msg && data.error) msg = data.error;
                if (!msg) msg = 'AI generation failed';
                
                if (typeof msg === 'object') {
                    if (msg.code === 401 && !msg.message) {
                        setError('Unauthorized: Your session may have expired or API Key is invalid. Please log in again.');
                    } else {
                        setError(JSON.stringify(msg));
                    }
                } else {
                    setError(msg);
                }
            }
        } catch (e: any) {
            setError(e.message || 'Connection error during AI generation')
        } finally {
            setAnalyzing(false)
        }
    }

    const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && labelInput.trim()) {
            e.preventDefault()
            const newLabel = labelInput.trim().replace(/,$/, '')
            if (newLabel && !labels.includes(newLabel)) {
                setLabels(prev => [...prev, newLabel])
            }
            setLabelInput('')
        }
    }

    const removeLabel = (l: string) => setLabels(prev => prev.filter(x => x !== l))

    const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true) }
    const onDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false) }
    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault(); setIsDragging(false)
        if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!summary.trim()) { setError('Bug Summary is required.'); return }
        setLoading(true); setError(''); setSuccess('')

        try {
            const res = await fetch('/api/bugs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary, description,
                    steps_to_reproduce: steps,
                    expected_result: expected,
                    actual_result: actual,
                    severity, projectId, jiraStoryId,
                    screenshotBase64: imageBase64,
                    startDate, dueDate, fixVersion, releaseVersion,
                    labels, assignedTo, postInTeams,
                    environmentInfo: {
                        userAgent: navigator.userAgent,
                        resolution: `${window.innerWidth}x${window.innerHeight}`,
                        url: window.location.href
                    }
                })
            })
            const data = await res.json()

            if (!res.ok) {
                const msg = data.error?.message || data.error || 'Failed to submit bug report'
                setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
                setLoading(false); return
            }

            if (data.integrations?.length > 0) {
                const jiraRes = data.integrations.find((i: any) => i.provider === 'jira')
                if (jiraRes?.success) setSuccess(`✅ Bug submitted & created in Jira: ${jiraRes.key}`)
                else if (jiraRes?.error) setError(`Jira Error: ${jiraRes.error}`)
            }

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2500)
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <form className={styles.formContainer} onSubmit={handleSubmit} noValidate>

            {/* Error / Success Banners */}
            {error && (
                <div className={styles.errorBanner}>
                    <AlertTriangle size={16} /> {error}
                </div>
            )}
            {success && (
                <div className={styles.successBanner}>
                    <CheckCircle2 size={16} /> {success}
                </div>
            )}

            {/* ── Screenshot Upload ─────────────────────────── */}
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    <UploadCloud size={15} /> Screenshot <span className={styles.optional}>(Optional – AI will analyze it)</span>
                </label>
                {!imageBase64 ? (
                    <div
                        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" accept="image/*" hidden ref={fileInputRef}
                            onChange={e => e.target.files && handleImageUpload(e.target.files[0])} />
                        <UploadCloud size={28} className={styles.dropIcon} />
                        <p>Drag & drop a screenshot or <span className={styles.browseLink}>browse</span></p>
                        <span className={styles.hint}>PNG, JPG, WEBP — max 10MB</span>
                    </div>
                ) : (
                    <div className={styles.imagePreviewContainer}>
                        <img src={imageBase64} alt="Screenshot Preview" className={styles.imagePreview} />
                        <div className={styles.imageOverlay}>
                            <button type="button" className={styles.removeImageBtn} onClick={() => setImageBase64(null)}>
                                <X size={14} /> Remove
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Summary + AI Button ───────────────────────── */}
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    Bug Summary <span className={styles.required}>*</span>
                </label>
                <div className={styles.summaryRow}>
                    <input
                        type="text" value={summary}
                        onChange={e => setSummary(e.target.value)}
                        placeholder="Briefly describe the issue…"
                        className={styles.input} required
                    />
                    <button
                        type="button" onClick={handleAIGenerate}
                        disabled={analyzing} className={styles.aiBtn}
                        title="Use AI to auto-fill the form based on screenshot + summary"
                    >
                        {analyzing
                            ? <><Sparkles size={15} className={styles.spin} /> Generating…</>
                            : <><Sparkles size={15} /> AI AutoGenerate</>
                        }
                    </button>
                </div>
                <span className={styles.hint}>Click AI AutoGenerate to auto-fill all fields using Gemini AI.</span>
            </div>

            {/* ── Project + Jira + Severity ─────────────────── */}
            <div className={styles.grid3}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Project <span className={styles.required}>*</span></label>
                    <select value={projectId} onChange={e => setProjectId(e.target.value)} className={styles.select} required>
                        <option value="" disabled>Select Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Severity</label>
                    <select value={severity} onChange={e => setSeverity(e.target.value)} className={`${styles.select} ${styles[`sev_${severity}`]}`}>
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🟠 High</option>
                        <option value="critical">🔴 Critical</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Jira Story Link</label>
                    <input type="text" value={jiraStoryId} onChange={e => setJiraStoryId(e.target.value)}
                        placeholder="e.g. PROJ-123" className={styles.input} />
                </div>
            </div>

            {/* ── Description ──────────────────────────────── */}
            <div className={styles.formGroup}>
                <label className={styles.label}>Description <span className={styles.aiTag}><Cpu size={11} /> AI</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Detailed bug description (auto-filled by AI or type manually)…"
                    rows={3} className={styles.textarea} />
            </div>

            {/* ── Steps / Expected / Actual ─────────────────── */}
            <div className={styles.grid2}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Steps to Reproduce <span className={styles.aiTag}><Cpu size={11} /> AI</span></label>
                    <textarea value={steps} onChange={e => setSteps(e.target.value)}
                        placeholder="1. Navigate to…&#10;2. Click…&#10;3. Observe…"
                        rows={4} className={styles.textarea} />
                </div>
                <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                        <label className={styles.label}>Expected Result <span className={styles.aiTag}><Cpu size={11} /> AI</span></label>
                        <textarea value={expected} onChange={e => setExpected(e.target.value)}
                            placeholder="What should happen…" rows={2} className={styles.textarea} />
                    </div>
                    <div>
                        <label className={styles.label}>Actual Result <span className={styles.aiTag}><Cpu size={11} /> AI</span></label>
                        <textarea value={actual} onChange={e => setActual(e.target.value)}
                            placeholder="What actually happens…" rows={2} className={styles.textarea} />
                    </div>
                </div>
            </div>

            {/* ── Dates + Versions ─────────────────────────── */}
            <div className={styles.grid4}>
                <div className={styles.formGroup}>
                    <label className={styles.label}><Calendar size={13} /> Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}><Calendar size={13} /> Due Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}><GitBranch size={13} /> Fix Version</label>
                    <input type="text" value={fixVersion} onChange={e => setFixVersion(e.target.value)}
                        placeholder="e.g. v2.1.0" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}><Package size={13} /> Release Version</label>
                    <input type="text" value={releaseVersion} onChange={e => setReleaseVersion(e.target.value)}
                        placeholder="e.g. 2024-Q1" className={styles.input} />
                </div>
            </div>

            {/* ── Labels + Assigned To ─────────────────────── */}
            <div className={styles.grid2}>
                <div className={styles.formGroup}>
                    <label className={styles.label}><Tag size={13} /> Labels <span className={styles.optional}>(press Enter to add)</span></label>
                    <div className={styles.labelContainer}>
                        {labels.map(l => (
                            <span key={l} className={styles.labelChip}>
                                {l} <button type="button" onClick={() => removeLabel(l)}><X size={10} /></button>
                            </span>
                        ))}
                        <input
                            type="text" value={labelInput}
                            onChange={e => setLabelInput(e.target.value)}
                            onKeyDown={handleLabelKeyDown}
                            placeholder={labels.length === 0 ? 'e.g. UI, regression…' : ''}
                            className={styles.labelInput}
                        />
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}><Users size={13} /> Assigned To</label>
                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={styles.select}>
                        <option value="">Unassigned</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Teams Toggle ─────────────────────────────── */}
            <div className={styles.teamsToggleRow}>
                <div className={styles.teamsToggleInfo}>
                    <BellRing size={18} className={styles.teamsIcon} />
                    <div>
                        <span className={styles.teamsLabel}>Post in Microsoft Teams</span>
                        <span className={styles.teamsSubLabel}>Send this bug report to the configured Teams channel on submission</span>
                    </div>
                </div>
                <label className={styles.switch}>
                    <input type="checkbox" checked={postInTeams} onChange={e => setPostInTeams(e.target.checked)} />
                    <span className={styles.slider}></span>
                </label>
            </div>

            {/* ── Submit ───────────────────────────────────── */}
            <button type="submit" className={styles.submitBtn} disabled={loading || analyzing}>
                {loading
                    ? <><span className={styles.spinner}></span> Submitting…</>
                    : <><Send size={16} /> Submit Bug Report</>
                }
            </button>

            {/* ── Branding ─────────────────────────────────── */}
            <div className={styles.poweredBy}>
                <Sparkles size={12} />
                <span>Powered by <strong>Gemini AI</strong></span>
            </div>
        </form>
    )
}
