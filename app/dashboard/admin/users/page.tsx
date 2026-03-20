import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { UserPlus, User, Mail, Shield, Calendar } from 'lucide-react';
import styles from './page.module.css';

export default async function UserManagementPage() {
    const supabase = await createClient();
    
    // Fetch all users
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>User Management</h1>
                    <p>Manage access for Team Leads and Members</p>
                </div>
                <Link href="/dashboard/admin/users/new" className={styles.addButton}>
                    <UserPlus size={18} />
                    <span>Provide Access</span>
                </Link>
            </div>

            <div className={styles.grid}>
                {users?.map((user) => (
                    <div key={user.id} className={styles.userCard}>
                        <div className={styles.userHeader}>
                            <div className={styles.avatar}>
                                {user.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className={styles.userInfo}>
                                <h3>{user.full_name || 'Unnamed User'}</h3>
                                <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                                    {user.role}
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
                                <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className={styles.cardActions}>
                            <button className={styles.editButton}>Edit Roles</button>
                        </div>
                    </div>
                ))}
            </div>

            {!users || users.length === 0 && (
                <div className={styles.emptyState}>
                    <User size={48} />
                    <p>No managed users found.</p>
                </div>
            )}
        </div>
    );
}
