export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { Bug, ArrowLeft, Clock, AlertTriangle, Monitor, Globe, ChevronRight } from 'lucide-react'
import { fetchJiraBugs } from '@/utils/jira'
import BugsClient from './BugsClient'

export default async function BugsListPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch all bugs from Jira API natively
    const { bugs: allBugs, integrations } = await fetchJiraBugs(supabase as any);
    const domain = integrations?.[0]?.config?.domain || 'toniktester';

    return (
        <div className={styles.layout}>
            <header className={styles.topbar}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Dashboard
                    </Link>
                    <h1>All Bug Reports</h1>
                </div>
            </header>

            <BugsClient allBugs={allBugs || []} domain={domain} />
        </div>
    )
}
