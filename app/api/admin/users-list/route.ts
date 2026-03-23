import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: users } = await supabase
            .from('users')
            .select('id, full_name, email, role')
            .order('full_name', { ascending: true });

        return NextResponse.json({ users: users || [] });
    } catch (e: any) {
        return NextResponse.json({ users: [] });
    }
}
