import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bug, ArrowLeft } from 'lucide-react'
import styles from './page.module.css'
import FormClient from './FormClient'

export default async function NewBugPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get project ID for context (just fetching the first one for simplicity in this demo)
    const { data: projects } = await supabase.from('projects').select('id, name').limit(1)
    let defaultProject = projects?.[0];

    if (!defaultProject) {
        const { data: newProject } = await supabase
            .from('projects')
            .insert([{ name: 'Demo Project', description: 'Auto-generated for testing purposes', created_by: user.id }])
            .select('id, name')
            .single();
        defaultProject = newProject || undefined;
    }

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
                    {defaultProject ? (
                        <FormClient projectId={defaultProject.id} projectName={defaultProject.name} />
                    ) : (
                        <div style={{ color: 'var(--text-muted)' }}>
                            <p>No project found. Please ensure your database is seeded with a project.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
