'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    let email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Managed Access Mapping (V7) - Updated to match user domain
    if (email.toLowerCase() === 'admin') {
        email = 'admin@tonik.com';
    } else if (!email.includes('@')) {
        // Assume users created by admin follow the 'username@tonik.com' pattern
        email = `${email.toLowerCase()}@tonik.com`;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error("Login error:", error)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
