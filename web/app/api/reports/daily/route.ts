import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
    const supabase = await createClient()

    // Note: For a real cron job, you would authenticate this endpoint via a secret key in headers.
    // For demonstration, we will just fetch bugs created in the last 24 hours.

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: bugs, error } = await supabase
        .from('bugs')
        .select('*, project:project_id(name)')
        .gte('created_at', oneDayAgo.toISOString())
        .order('severity', { ascending: false });

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch bugs' }, { status: 500 });
    }

    const criticalCount = bugs?.filter(b => b.severity === 'critical').length || 0;
    const highCount = bugs?.filter(b => b.severity === 'high').length || 0;
    const totalCount = bugs?.length || 0;

    // Generate HTML Email Template
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background-color: #1e1e2d; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .summary { padding: 20px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .content { padding: 20px; }
        .bug-item { border-left: 4px solid #d1d5db; padding-left: 15px; margin-bottom: 20px; }
        .bug-item.critical { border-left-color: #ef4444; }
        .bug-item.high { border-left-color: #f97316; }
        .bug-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 5px 0; }
        .bug-meta { font-size: 13px; color: #6b7280; margin: 0 0 10px 0; }
        .bug-ai-insight { background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 13px; color: #374151; font-style: italic; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Daily Defect Report</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #9ca3af;">${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
          <div class="stat">
            <div class="stat-value">${totalCount}</div>
            <div class="stat-label">Total Logged</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #ef4444;">${criticalCount}</div>
            <div class="stat-label">Critical</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #f97316;">${highCount}</div>
            <div class="stat-label">High Priority</div>
          </div>
        </div>

        <div class="content">
          <h2 style="font-size: 18px; color: #111827; margin-top: 0;">New Bugs (Last 24h)</h2>
          
          ${bugs?.map(bug => `
            <div class="bug-item ${bug.severity}">
              <h3 class="bug-title">[${bug.severity.toUpperCase()}] ${bug.summary}</h3>
              <p class="bug-meta">Project: ${bug.project?.name || 'Unknown'} | Status: ${bug.status}</p>
              <div class="bug-ai-insight">
                <strong>AI Root Cause:</strong> ${bug.root_cause || 'Analyzing...'}
              </div>
            </div>
          `).join('') || '<p>No bugs logged yesterday! 🎉</p>'}
          
        </div>
        
        <div class="footer">
          Generated automatically by AI Bug Reporter.<br>
          <a href="#" style="color: #6366f1;">View full dashboard</a>
        </div>
      </div>
    </body>
    </html>
  `;

    // Simulation: Instead of actually connecting to AWS SES or Resend here, we will return the HTML payload directly 
    // so you can view the template visually in the browser by visiting /api/reports/daily.
    // In a production app, we would use `resend.emails.send({ ... })`

    return new NextResponse(htmlTemplate, {
        status: 200,
        headers: {
            'Content-Type': 'text/html'
        }
    })
}
