'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    let email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Managed Access Mapping - match the @tonikbank.com domain used at user creation
    if (email.toLowerCase() === 'admin') {
        email = 'admin@tonik.com';
    } else if (!email.includes('@')) {
        // Users created by admin follow the 'username@tonikbank.com' pattern
        email = `${email.toLowerCase()}@tonikbank.com`;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error("Login error:", error)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
