import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'admin@tonik.com') {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;
        const body = await req.json();
        const { name } = body;

        if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

        const { data: project, error } = await supabase.from('projects').update({ name }).eq('id', id).select().single();

        if (error) throw error;
        return NextResponse.json({ project });

    } catch (e: any) {
        console.error("Update project error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'admin@tonik.com') {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;

        const { error } = await supabase.from('projects').delete().eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Delete project error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
