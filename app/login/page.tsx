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

    return (
        <div className={styles.container}>
            <div className={styles.glassPanel}>
                <div className={styles.header}>
                    <Bug className={styles.icon} size={32} />
                    <h1>Welcome Back</h1>
                    <p>Sign in to your AI Bug Reporter account</p>
                </div>

                {state?.error && (
                    <div className={styles.errorMessage}>
                        {state.error}
                    </div>
                )}

                <form className={styles.form} action={formAction}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input id="email" name="email" type="email" required placeholder="name@company.com" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input id="password" name="password" type="password" required placeholder="••••••••" />
                    </div>

                    <button type="submit" disabled={isPending} className={styles.primaryButton}>
                        {isPending ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <p className={styles.footerText}>
                    Don't have an account? <Link href="/signup">Sign up</Link>
                </p>
            </div>
        </div>
    )
}
