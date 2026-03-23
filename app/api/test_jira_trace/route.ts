import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fetchJiraBugs } from '@/utils/jira';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();
    try {
        const { bugs, integrations } = await fetchJiraBugs(supabase as any, undefined, `issuetype = "Bug"`);
        return NextResponse.json({ success: true, bugsLength: bugs?.length, bugs: bugs?.slice(0,2) });
    } catch(e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
