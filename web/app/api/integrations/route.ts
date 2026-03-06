import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('project_id', projectId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ integrations: data })
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { projectId, provider, config } = body

        if (!projectId || !provider || !config) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Upsert the integration
        const { data, error } = await supabase
            .from('integrations')
            .upsert({
                project_id: projectId,
                provider: provider,
                config: config,
                updated_at: new Date().toISOString()
            }, { onConflict: 'project_id, provider' }) // Note: requires a unique constraint, which exists
            .select()
            .single()

        if (error) {
            console.error('Integration save error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, integration: data })

    } catch (e: any) {
        console.error('API Error:', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
