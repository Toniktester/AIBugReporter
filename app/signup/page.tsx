'use client'

import { signup } from './actions'
import Link from 'next/link'
import styles from '../login/page.module.css' // Reusing login styles for consistency
import { Bug } from 'lucide-react'
import { useActionState } from 'react'

const initialState = {
    error: null as string | null,
}

export default function SignupPage() {
    const [state, formAction, isPending] = useActionState(signup, initialState);

    return (
        <div className={styles.container}>
            <div className={styles.glassPanel}>
                <div className={styles.header}>
                    <Bug className={styles.icon} size={32} />
                    <h1>Create Account</h1>
                    <p>Join the AI Bug Reporter platform</p>
                </div>

                {state?.error && (
                    <div className={styles.errorMessage}>
                        {state.error}
                    </div>
                )}

                <form className={styles.form} action={formAction}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="full_name">Full Name</label>
                        <input id="full_name" name="full_name" type="text" required placeholder="John Doe" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input id="email" name="email" type="email" required placeholder="name@company.com" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input id="password" name="password" type="password" required placeholder="••••••••" />
                    </div>

                    <button type="submit" disabled={isPending} className={styles.primaryButton}>
                        {isPending ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <p className={styles.footerText}>
                    Already have an account? <Link href="/login">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
