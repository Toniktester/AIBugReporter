'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share, RefreshCcw } from 'lucide-react'
import styles from './page.module.css'

export default function BugActions({ bugId, initialStatus }: { bugId: string, initialStatus: string }) {
    const [status, setStatus] = useState(initialStatus)
    const [updating, setUpdating] = useState(false)
    const [copied, setCopied] = useState(false)
    const router = useRouter()

    const handleShare = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }

    const handleStatusUpdate = async () => {
        // Toggle sequence: open -> in_progress -> resolved -> closed -> open...
        const statusFlow = ['open', 'in_progress', 'resolved', 'closed'];
        const currentIndex = statusFlow.indexOf(status);
        const nextStatus = statusFlow[(currentIndex + 1) % statusFlow.length];

        setUpdating(true)
        try {
            const res = await fetch(`/api/bugs/${bugId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                setStatus(nextStatus);
                router.refresh(); // Refresh the server component to pull new data
            }
        } catch (err) {
            console.error('Failed to update status', err);
        } finally {
            setUpdating(false);
        }
    }

    return (
        <div className={styles.actions}>
            <button className={styles.secondaryBtn} onClick={handleShare}>
                <Share size={16} style={{ marginRight: '0.5rem' }} />
                {copied ? 'Copied Link!' : 'Share'}
            </button>
            <button className={styles.primaryBtn} onClick={handleStatusUpdate} disabled={updating}>
                {updating ? <RefreshCcw size={16} className="animate-spin" /> : 'Update Status'}
            </button>
        </div>
    )
}
