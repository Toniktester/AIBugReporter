'use client'

import { useState, useRef, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { AlertTriangle, Send, UploadCloud, Sparkles, X, Image as ImageIcon } from 'lucide-react'

export default function FormClient({ projectId, projectName }: { projectId: string; projectName: string }) {
    const [summary, setSummary] = useState('')
    const [description, setDescription] = useState('')
    const [steps, setSteps] = useState('')
    const [expected, setExpected] = useState('')
    const [actual, setActual] = useState('')
    const [severity, setSeverity] = useState('low')
    const [jiraStoryId, setJiraStoryId] = useState('')

    const [imageBase64, setImageBase64] = useState<string | null>(null)
    const [inputType, setInputType] = useState<'screenshot' | 'text'>('screenshot')
    const [analyzing, setAnalyzing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isDragging, setIsDragging] = useState(false)

    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file.')
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setImageBase64(base64);
            await analyzeScreenshot(base64);
        };
        reader.readAsDataURL(file);
    }

    const analyzeScreenshot = async (base64: string) => {
        setAnalyzing(true);
        setError('');
        try {
            const res = await fetch('/api/ai/analyze-screenshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64 })
            });
            const data = await res.json();

            if (res.ok && data.ai_data) {
                const ai = data.ai_data;
                if (ai.summary) setSummary(ai.summary);
                if (ai.description) setDescription(ai.description);
                if (ai.steps_to_reproduce) setSteps(ai.steps_to_reproduce);
                if (ai.expected_result) setExpected(ai.expected_result);
                if (ai.actual_result) setActual(ai.actual_result);
                if (ai.severity) setSeverity(ai.severity.toLowerCase());
            } else {
                throw new Error(data.error || 'Failed to analyze image');
            }
        } catch (err: any) {
            const msg = (err.message && typeof err.message === 'object') ? JSON.stringify(err.message) : (err.message || 'An unknown error occurred');
            setError(msg);
        } finally {
            setAnalyzing(false);
        }
    }

    const analyzeTextSummary = async () => {
        if (!summary.trim()) {
            setError('Please enter a bug summary to generate a report.');
            return;
        }

        setAnalyzing(true);
        setError('');
        try {
            const res = await fetch('/api/ai/generate-text-bug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ summary })
            });
            const data = await res.json();

            if (res.ok && data.ai_data) {
                const ai = data.ai_data;
                // Don't overwrite their manually typed summary unless it was profoundly improved
                if (ai.description) setDescription(ai.description);
                if (ai.steps_to_reproduce) setSteps(ai.steps_to_reproduce);
                if (ai.expected_result) setExpected(ai.expected_result);
                if (ai.actual_result) setActual(ai.actual_result);
                if (ai.severity) setSeverity(ai.severity.toLowerCase());
            } else {
                throw new Error(data.error || 'Failed to generate text bug');
            }
        } catch (err: any) {
            const msg = typeof err.message === 'object' ? JSON.stringify(err.message) : (err.message || 'An unknown error occurred');
            setError(msg);
        } finally {
            setAnalyzing(false);
        }
    }

    const onDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }
    const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }
    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Updated payload mapping for V2
            const res = await fetch('/api/bugs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary,
                    description,
                    steps_to_reproduce: steps,
                    expected_result: expected,
                    actual_result: actual,
                    severity,
                    projectId,
                    jiraStoryId,
                    screenshotBase64: imageBase64,
                    environmentInfo: {
                        userAgent: navigator.userAgent,
                        resolution: `${window.innerWidth}x${window.innerHeight}`,
                        url: window.location.href
                    }
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit bug report');
            }

            // Integrations parsing
            if (data.integrations && data.integrations.length > 0) {
                const jiraRes = data.integrations.find((i: any) => i.provider === 'jira');
                if (jiraRes) {
                    if (jiraRes.success) {
                        window.alert(`Jira bug created - ${jiraRes.key}`);
                    } else {
                        window.alert(`Jira Integration Error:\n\n${jiraRes.error}`);
                    }
                }
            }

            router.push(`/bugs/${data.bug.id}`);

        } catch (err: any) {
            const msg = typeof err.message === 'object' ? JSON.stringify(err.message) : (err.message || 'An unknown error occurred');
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.formContainer}>
            {error && (
                <div className={styles.errorBanner}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Input Type Toggle */}
            <div className={styles.typeToggle}>
                <button
                    type="button"
                    className={`${styles.toggleBtn} ${inputType === 'screenshot' ? styles.active : ''}`}
                    onClick={() => { setInputType('screenshot'); setError(''); }}
                >
                    <UploadCloud size={16} /> Upload Screenshot
                </button>
                <button
                    type="button"
                    className={`${styles.toggleBtn} ${inputType === 'text' ? styles.active : ''}`}
                    onClick={() => { setInputType('text'); setImageBase64(null); setError(''); }}
                >
                    <Sparkles size={16} /> Text Summary
                </button>
            </div>

            {inputType === 'screenshot' && (
                <div className={styles.formGroup}>
                    <label>Screenshot Evidence (Triggers AI Autofill)</label>
                    {!imageBase64 ? (
                        <div
                            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                ref={fileInputRef}
                                onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                            />
                            <UploadCloud size={32} className={styles.dropIcon} />
                            <p>Drag and drop a screenshot here, or click to browse</p>
                            <span className={styles.hint}>AI will automatically extract the bug details.</span>
                        </div>
                    ) : (
                        <div className={styles.imagePreviewContainer}>
                            <img src={imageBase64} alt="Screenshot Preview" className={styles.imagePreview} />
                            <div className={styles.imageOverlay}>
                                {analyzing ? (
                                    <div className={styles.analyzingBadge}><Sparkles size={14} className="animate-spin" /> Analyzing Image...</div>
                                ) : (
                                    <button type="button" className={styles.removeImageBtn} onClick={() => setImageBase64(null)}>
                                        <X size={16} /> Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={styles.formGroup}>
                <label>Project</label>
                <input type="text" readOnly value={projectName} className={`${styles.input} ${styles.readOnly}`} />
            </div>

            <div className={styles.formGroup}>
                <label>Jira Link (Optional)</label>
                <input
                    type="text"
                    value={jiraStoryId}
                    onChange={(e) => setJiraStoryId(e.target.value)}
                    placeholder="e.g. PROJ-123 (Tag bug to existing Epic/Story)"
                    className={styles.input}
                />
            </div>

            <div className={styles.formGroup}>
                <label>Bug Summary <span className={styles.required}>*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Briefly describe the issue..."
                        required
                        className={styles.input}
                        style={{ flex: 1 }}
                    />
                    {inputType === 'text' && (
                        <button
                            type="button"
                            onClick={analyzeTextSummary}
                            disabled={analyzing || !summary.trim()}
                            style={{
                                padding: '0 1rem', background: 'var(--primary-color)', color: '#fff',
                                border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: '0.5rem', fontWeight: 500
                            }}
                        >
                            {analyzing ? <Sparkles size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            Auto-Generate
                        </button>
                    )}
                </div>
                {inputType === 'text' && (
                    <span className={styles.hint}>Type a summary and click Auto-Generate to fill out the form using AI.</span>
                )}
            </div>

            {/* V2: Editable AI Fields. These stay visible if populated, otherwise shown as standard fields */}
            <div className={styles.formGroup}>
                <label>Description (Editable AI output)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed explanation generated by AI or typed manually..."
                    rows={2}
                    className={styles.textarea}
                />
            </div>

            <div className={styles.splitRow}>
                <div className={styles.formGroup}>
                    <label>Steps to Reproduce</label>
                    <textarea
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                        placeholder="1. Go to... 2. Click..."
                        rows={3}
                        className={styles.textarea}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Expected / Actual Results</label>
                    <textarea
                        value={expected}
                        onChange={(e) => setExpected(e.target.value)}
                        placeholder="Expected: Should save user..."
                        rows={1}
                        className={styles.textarea}
                        style={{ marginBottom: '0.5rem' }}
                    />
                    <textarea
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        placeholder="Actual: Throws error 500..."
                        rows={1}
                        className={styles.textarea}
                    />
                </div>
            </div>

            <div className={styles.formGroup}>
                <label>Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={styles.select}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            </div>

            <button onClick={handleSubmit} className={styles.submitBtn} disabled={loading || analyzing}>
                {loading ? 'Submitting...' : analyzing ? 'Waiting for AI...' :
                    <><Send size={16} /> Submit Bug</>
                }
            </button>
        </div>
    )
}
