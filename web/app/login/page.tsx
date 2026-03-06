import { login } from './actions'
import Link from 'next/link'
import styles from './page.module.css'
import { Bug } from 'lucide-react'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const params = await searchParams;

    return (
        <div className={styles.container}>
            <div className={styles.glassPanel}>
                <div className={styles.header}>
                    <Bug className={styles.icon} size={32} />
                    <h1>Welcome Back</h1>
                    <p>Sign in to your AI Bug Reporter account</p>
                </div>

                {params?.error && (
                    <div className={styles.errorMessage}>
                        {params.error}
                    </div>
                )}

                <form className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input id="email" name="email" type="email" required placeholder="name@company.com" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input id="password" name="password" type="password" required placeholder="••••••••" />
                    </div>

                    <button formAction={login} className={styles.primaryButton}>
                        Sign In
                    </button>
                </form>

                <p className={styles.footerText}>
                    Don't have an account? <Link href="/signup">Sign up</Link>
                </p>
            </div>
        </div>
    )
}
