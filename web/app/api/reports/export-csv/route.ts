import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
    const supabase = await createClient()

    // Ensure user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // Fetch all bugs for the user to export
    const { data: bugs, error } = await supabase
        .from('bugs')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return new NextResponse('Error fetching data for export', { status: 500 })
    }

    // Convert bugs array to CSV string
    // For safety, handle commas or quotes inside strings
    const headers = ['Bug ID', 'Project ID', 'Created At', 'Summary', 'Severity', 'Status', 'Root Cause']

    const escapeCsv = (str: string | null | undefined) => {
        if (!str) return '""';
        return `"${String(str).replace(/"/g, '""')}"`;
    }

    const csvRows = bugs?.map(bug => [
        bug.id,
        bug.project_id,
        new Date(bug.created_at).toISOString(),
        escapeCsv(bug.summary),
        bug.severity,
        bug.status,
        escapeCsv(bug.root_cause)
    ].join(',')) || []

    const csvData = [headers.join(','), ...csvRows].join('\n')

    return new NextResponse(csvData, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="bug_report_${new Date().toISOString().split('T')[0]}.csv"`
        }
    })
}
