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
            setError(err.message);
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

            router.push(`/bugs/${data.bug.id}`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            {error && (
                <div className={styles.errorBanner}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Drag & Drop Screenshot UI */}
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
                <input
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Briefly describe the issue..."
                    required
                    className={styles.input}
                />
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

            <button type="submit" className={styles.submitBtn} disabled={loading || analyzing}>
                {loading ? 'Submitting...' : analyzing ? 'Waiting for AI...' :
                    <><Send size={16} /> Submit Bug</>
                }
            </button>
        </form>
    )
}
