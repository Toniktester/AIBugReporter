import { signup } from './actions'
import Link from 'next/link'
import styles from '../login/page.module.css' // Reusing login styles for consistency
import { Bug } from 'lucide-react'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const params = await searchParams;

    return (
        <div className={styles.container}>
            <div className={styles.glassPanel}>
                <div className={styles.header}>
                    <Bug className={styles.icon} size={32} />
                    <h1>Create Account</h1>
                    <p>Join the AI Bug Reporter platform</p>
                </div>

                {params?.error && (
                    <div className={styles.errorMessage}>
                        {params.error}
                    </div>
                )}

                <form className={styles.form}>
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

                    <button formAction={signup} className={styles.primaryButton}>
                        Create Account
                    </button>
                </form>

                <p className={styles.footerText}>
                    Already have an account? <Link href="/login">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
