import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { UserPlus, User, Mail, Calendar, ArrowLeft, Users } from 'lucide-react';
import styles from './page.module.css';

export default async function UserManagementPage() {
    // Use admin client to bypass RLS and see ALL users
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let users: any[] = [];

    if (serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        users = data || [];
    } else {
        // Fallback: regular client (may be RLS-limited)
        const supabase = await createServerClient();
        const { data } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        users = data || [];
    }

    const roleLabel: Record<string, string> = {
        admin: 'Admin',
        qa_lead: 'Team Lead',
        tester: 'QA Tester',
    };

    return (
        <div className={styles.container}>
            {/* Back Button */}
            <Link href="/dashboard/admin" className={styles.backLink}>
                <ArrowLeft size={16} />
                <span>Back to Dashboard</span>
            </Link>

            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div className={styles.titleRow}>
                        <Users size={24} style={{ color: 'var(--primary-color)' }} />
                        <h1>User Management</h1>
                    </div>
                    <p>Manage access for Team Leads and Members &mdash; <strong>{users.length}</strong> user{users.length !== 1 ? 's' : ''} total</p>
                </div>
                <Link href="/dashboard/admin/users/new" className={styles.addButton}>
                    <UserPlus size={18} />
                    <span>Provide Access</span>
                </Link>
            </div>

            {users.length === 0 ? (
                <div className={styles.emptyState}>
                    <User size={48} />
                    <p>No managed users found. Use "Provide Access" to create one.</p>
                    {!serviceRoleKey && (
                        <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.5rem' }}>
                            ⚠️ SUPABASE_SERVICE_ROLE_KEY is not configured — only your own profile may be visible.
                        </p>
                    )}
                </div>
            ) : (
                <div className={styles.grid}>
                    {users.map((user) => (
                        <div key={user.id} className={styles.userCard}>
                            <div className={styles.userHeader}>
                                <div className={styles.avatar}>
                                    {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className={styles.userInfo}>
                                    <h3>{user.full_name || 'Unnamed User'}</h3>
                                    <span className={`${styles.roleBadge} ${styles[user.role] || ''}`}>
                                        {roleLabel[user.role] || user.role}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.userDetails}>
                                <div className={styles.detailItem}>
                                    <Mail size={14} />
                                    <span>{user.email}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <Calendar size={14} />
                                    <span>Joined {new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>

                            <div className={styles.cardActions}>
                                <button className={styles.editButton}>Edit Roles</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
