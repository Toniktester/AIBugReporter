import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return null;
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

async function verifyAdmin() {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await serverSupabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && user.email?.toLowerCase() !== 'admin@tonik.com') return null;
    return user;
}

// PATCH /api/admin/users/[id] — Update user role
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await verifyAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { role } = await req.json();

        if (!role) return NextResponse.json({ error: 'Role is required' }, { status: 400 });

        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });

        // Update profile table
        const { error: profileError } = await supabaseAdmin
            .from('users')
            .update({ role })
            .eq('id', id);

        if (profileError) throw profileError;

        // Also update auth metadata
        await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: { role }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE /api/admin/users/[id] — Delete user
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await verifyAdmin();
        if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;

        // Prevent self-deletion
        if (id === admin.id) {
            return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
        }

        const supabaseAdmin = getAdminClient();
        if (!supabaseAdmin) return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });

        // Delete profile first (FK may require this)
        await supabaseAdmin.from('users').delete().eq('id', id);

        // Delete from auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) throw authError;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
