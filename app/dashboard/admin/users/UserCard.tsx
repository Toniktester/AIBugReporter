'use client';

import { useState } from 'react';
import { Mail, Calendar, Check, X, Trash2, Edit2 } from 'lucide-react';
import styles from './page.module.css';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    qa_lead: 'Team Lead',
    tester: 'QA Tester',
};

export default function UserCard({ user, currentUserId }: { user: User; currentUserId: string }) {
    const [editing, setEditing] = useState(false);
    const [selectedRole, setSelectedRole] = useState(user.role);
    const [currentRole, setCurrentRole] = useState(user.role);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isSelf = user.id === currentUserId;

    const handleSave = async () => {
        if (selectedRole === currentRole) { setEditing(false); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: selectedRole })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update role');
            setCurrentRole(selectedRole);
            setEditing(false);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${user.full_name || user.email}"? This action cannot be undone.`)) return;
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete user');
            // Remove card from DOM
            window.location.reload();
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    return (
        <div className={styles.userCard}>
            <div className={styles.userHeader}>
                <div className={styles.avatar}>
                    {(user.full_name || user.email)?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className={styles.userInfo}>
                    <h3>{user.full_name || 'Unnamed User'}</h3>
                    <span className={`${styles.roleBadge} ${styles[currentRole] || ''}`}>
                        {ROLE_LABELS[currentRole] || currentRole}
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

            {error && <p className={styles.cardError}>{error}</p>}

            <div className={styles.cardActions}>
                {editing ? (
                    <div className={styles.editRow}>
                        <select
                            value={selectedRole}
                            onChange={e => setSelectedRole(e.target.value)}
                            className={styles.roleSelect}
                            disabled={loading}
                        >
                            <option value="tester">QA Tester</option>
                            <option value="qa_lead">Team Lead</option>
                            <option value="admin">System Admin</option>
                        </select>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className={styles.iconBtnSave}
                            title="Save"
                        >
                            <Check size={14} />
                        </button>
                        <button
                            onClick={() => { setEditing(false); setSelectedRole(currentRole); setError(''); }}
                            disabled={loading}
                            className={styles.iconBtnCancel}
                            title="Cancel"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className={styles.actionRow}>
                        <button
                            onClick={() => setEditing(true)}
                            className={styles.editButton}
                            disabled={loading}
                        >
                            <Edit2 size={13} /> Edit Role
                        </button>
                        {!isSelf && (
                            <button
                                onClick={handleDelete}
                                className={styles.deleteButton}
                                disabled={loading}
                                title="Delete User"
                            >
                                <Trash2 size={13} /> {loading ? 'Deleting…' : 'Delete'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
