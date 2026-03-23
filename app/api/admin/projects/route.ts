import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Retrieve projects (Admins see all)
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'admin@tonik.com') {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: projects, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ projects });

    } catch (e: any) {
        console.error("Fetch projects error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'admin@tonik.com') {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

        const { data: project, error } = await supabase.from('projects').insert({ name }).select().single();

        if (error) throw error;
        return NextResponse.json({ project });

    } catch (e: any) {
        console.error("Create project error:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
