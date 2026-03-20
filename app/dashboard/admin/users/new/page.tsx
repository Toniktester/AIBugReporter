'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Shield, Mail, Key, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function CreateUserPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const fullName = formData.get('fullName') as string;
        const password = formData.get('password') as string;
        const role = formData.get('role') as string;

        try {
            const res = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, fullName, password, role })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create user');
            }

            setSuccess(`User "${username}" created successfully!`);
            setTimeout(() => router.push('/dashboard/admin/users'), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Link href="/dashboard/admin/users" className={styles.backLink}>
                <ArrowLeft size={16} />
                <span>Back to Users</span>
            </Link>

            <div className={styles.formCard}>
                <div className={styles.formHeader}>
                    <div className={styles.iconCircle}>
                        <UserPlus size={24} />
                    </div>
                    <h1>Provide New Access</h1>
                    <p>Create credentials for Team Leads and Members</p>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}
                {success && <div className={styles.successMessage}>{success}</div>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGrid}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="username">Username</label>
                            <div className={styles.inputWrapper}>
                                <User size={18} className={styles.inputIcon} />
                                <input id="username" name="username" type="text" required placeholder="e.g. kavin.tester" />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="fullName">Full Name</label>
                            <div className={styles.inputWrapper}>
                                <Mail size={18} className={styles.inputIcon} />
                                <input id="fullName" name="fullName" type="text" required placeholder="e.g. Kavin Kumar" />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">Initial Password</label>
                            <div className={styles.inputWrapper}>
                                <Key size={18} className={styles.inputIcon} />
                                <input id="password" name="password" type="password" required placeholder="Min 6 characters" />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="role">System Role</label>
                            <div className={styles.inputWrapper}>
                                <Shield size={18} className={styles.inputIcon} />
                                <select id="role" name="role" required>
                                    <option value="tester">QA Member (Tester)</option>
                                    <option value="qa_lead">Team Lead</option>
                                    <option value="admin">System Admin</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <p className={styles.infoText}>
                        Users will be created with the <code>@local.com</code> domain extension internally.
                    </p>

                    <button type="submit" disabled={loading} className={styles.submitButton}>
                        {loading ? 'Creating Account...' : 'Generate Credentials'}
                    </button>
                </form>
            </div>
        </div>
    );
}
