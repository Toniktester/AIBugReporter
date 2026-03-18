import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fail safe: if env is missing, don't crash middleware
    if (!supabaseUrl || !supabaseAnonKey) {
        return supabaseResponse
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // refreshing the auth token
    const { data: { user } } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    if (
        !user &&
        !path.startsWith('/login') &&
        !path.startsWith('/signup') &&
        path !== '/'
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user) {
        let role = 'tester'
        try {
            // Fetch the active user's role from the public.users table
            const { data: roleData, error: roleError } = await supabase.from('users').select('role').eq('id', user.id).single()
            if (!roleError && roleData) {
                role = roleData.role
            }
        } catch (e) {
            console.error('Middleware role lookup failed:', e)
            // Fallback to tester role
        }

        // Protect Admin Routes
        if (path.startsWith('/dashboard/admin') && role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // Protect Team Lead Routes
        if (path.startsWith('/dashboard/lead') && role !== 'admin' && role !== 'qa_lead') {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // Redirect logged-in users away from auth pages
        if (path === '/login' || path === '/signup' || path === '/') {
            const url = request.nextUrl.clone()

            // Optional: route admins automatically to admin dash
            if (role === 'admin') url.pathname = '/dashboard/admin'
            else if (role === 'qa_lead') url.pathname = '/dashboard/lead'
            else url.pathname = '/dashboard'

            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
