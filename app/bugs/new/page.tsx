import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bug, ArrowLeft } from 'lucide-react'
import styles from './page.module.css'
import FormClient from './FormClient'

export default async function NewBugPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!user) {
        redirect('/login');
    }

    const { data: projects } = await supabase.from('projects').select('id, name').order('created_at', { ascending: false });

    return (
        <div className={styles.layout}>
            <header className={styles.topbar}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Dashboard
                    </Link>
                    <h1>Report a New Bug</h1>
                </div>
            </header>

            <div className={styles.container}>
                <div className={`${styles.card} glass`}>
                    {projects && projects.length > 0 ? (
                        <FormClient projects={projects} serverToken={session?.access_token || ''} />
                    ) : (
                        <div style={{ color: 'var(--text-muted)' }}>
                            <p>No projects found. Please ensure an Administrator has created a project before logging bugs.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
