'use client'

import { login } from './actions'
import Link from 'next/link'
import styles from './page.module.css'
import { Bug } from 'lucide-react'
import { useActionState } from 'react'

const initialState = {
    error: null as string | null,
}

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, initialState);

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const message = searchParams?.get('message');

    return (
        <div className={styles.container}>
            <div className={styles.glassPanel}>
                <div className={styles.header}>
                    <Bug className={styles.icon} size={32} />
                    <h1>Welcome Back</h1>
                    <p>Enter your credentials to access the portal</p>
                </div>

                {message && (
                    <div style={{ 
                        padding: '12px', 
                        backgroundColor: 'rgba(52, 152, 219, 0.1)', 
                        border: '1px solid var(--primary)', 
                        borderRadius: '8px', 
                        color: 'var(--primary)', 
                        fontSize: '0.9rem',
                        marginBottom: '1rem',
                        textAlign: 'center'
                    }}>
                        {message}
                    </div>
                )}

                {state?.error && (
                    <div className={styles.errorMessage}>
                        {state.error}
                    </div>
                )}

                <form className={styles.form} action={formAction}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Username</label>
                        <input id="email" name="email" type="text" required placeholder="Enter Username (e.g. Admin)" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input id="password" name="password" type="password" required placeholder="••••••••" />
                    </div>

                    <button type="submit" disabled={isPending} className={styles.primaryButton}>
                        {isPending ? 'Logging In...' : 'Log In'}
                    </button>
                </form>

                <p className={styles.footerText}>
                    Only managed accounts can access this system.
                </p>
            </div>
        </div>
    )
}
