import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        // 1. Verify the requester is an Admin
        const serverSupabase = await createServerClient();
        const { data: { user: adminUser } } = await serverSupabase.auth.getUser();

        if (!adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: adminProfile } = await serverSupabase
            .from('users')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        if (adminProfile?.role !== 'admin' && adminUser.email?.toLowerCase() !== 'admin@tonik.com') {
            return NextResponse.json({ error: 'Forbidden: Only Admins can create users' }, { status: 403 });
        }

        // 2. Parse request
        const { username, fullName, password, role } = await req.json();

        if (!username || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Internal email mapping
        const email = `${username.toLowerCase()}@local.com`;

        // 3. Initialize Supabase Admin Client (using service role key)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            return NextResponse.json({ 
                error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in Netlify. Admin actions are disabled.' 
            }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 4. Create User in Auth
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role }
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 5. Create Profile in public.users
        const { error: profileError } = await serverSupabase
            .from('users')
            .insert({
                id: newUser.user.id,
                email,
                full_name: fullName,
                role
            });

        if (profileError) {
            // Cleanup auth user if profile creation fails? 
            // Better to just report and let admin fix it.
            console.error('Profile creation error:', profileError);
        }

        return NextResponse.json({ success: true, user: newUser.user });

    } catch (err: any) {
        console.error('Admin Create User Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
