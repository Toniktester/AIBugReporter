import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('bugs')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Failed to update status', error);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, bug: data });

    } catch (e: any) {
        console.error('Error in status update:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
