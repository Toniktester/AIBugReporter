import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        
        const sbAdmin = createAdminClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data: users } = await sbAdmin
            .from('users')
            .select('id, full_name, email, role')
            .order('full_name', { ascending: true });

        return NextResponse.json({ users: users || [] });
    } catch (e: any) {
        return NextResponse.json({ users: [] });
    }
}
