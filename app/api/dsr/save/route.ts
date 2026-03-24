import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, config } = body;

        if (id) {
            const { error } = await supabase.from('integrations').update({ config }).eq('id', id);
            if (error) throw new Error(error.message);
        } else {
            const { error } = await supabase.from('integrations').insert({ provider: 'dsr_email', config });
            if (error) throw new Error(error.message);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to save DSR setup' }, { status: 500 });
    }
}
