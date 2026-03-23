export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import { fetchJiraBugs } from '@/utils/jira'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch bugs for reporting natively from Jira 
    const { bugs } = await fetchJiraBugs(supabase as any);

    return (
        <div className={styles.layout}>
            <ReportsClient bugs={bugs || []} />
        </div>
    )
}
