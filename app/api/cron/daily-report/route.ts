import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { fetchJiraBugs } from '@/utils/jira';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_NnRCmKsP_PiYkcSE5oEtwgi6WTKnnW6Vy');

export async function POST(req: Request) {
    try {
        // Secure the Cron Endpoint
        const authHeader = req.headers.get('Authorization');
        const expectedSecret = process.env.CRON_SECRET || 'dev-secret';
        
        if (authHeader !== `Bearer ${expectedSecret}`) {
            return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase keys for cron execution.');
        }

        const sbAdmin = createAdminClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Fetch unified metrics
        const { bugs } = await fetchJiraBugs(sbAdmin as any);
        if (!bugs) throw new Error('Failed to fetch Jira bugs.');

        const totalBugs = bugs.length;
        const criticalBugs = bugs.filter((b: any) => b.severity === 'critical').length;
        const openBugs = bugs.filter((b: any) => ['open', 'in_progress', 'To Do', 'In Progress'].includes(b.status)).length;
        const resolvedBugs = totalBugs - openBugs;
        const passFailStatus = criticalBugs > 0 ? 'CRITICAL RISK 🔴' : (openBugs > 5 ? 'WARNING 🟡' : 'HEALTHY 🟢');

        // Render HTML Email Template
        const htmlPayload = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; }
                .container { max-width: 700px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 6px solid #6366f1; }
                h1 { color: #0f172a; margin-top: 0; }
                .status-badge { display: inline-block; padding: 8px 16px; border-radius: 999px; font-weight: bold; font-size: 14px; background: #f1f5f9; color: #334155; margin-bottom: 25px; }
                .status-badge.critical { background: #fee2e2; color: #b91c1c; }
                .status-badge.healthy { background: #dcfce3; color: #15803d; }
                .status-badge.warning { background: #fef9c3; color: #a16207; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
                .card { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
                .card h3 { margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-transform: uppercase; }
                .card p { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; }
                .table-container { margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                th { background: #f1f5f9; font-weight: 600; color: #475569; }
                .urgent-row { background: #fff1f2; }
                .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                a { color: #6366f1; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Daily QA Status Report</h1>
                
                <div class="status-badge ${criticalBugs > 0 ? 'critical' : (openBugs > 5 ? 'warning' : 'healthy')}">
                    Overall System Status: ${passFailStatus}
                </div>

                <div class="grid">
                    <div class="card">
                        <h3>Total Tracked Defects</h3>
                        <p>${totalBugs}</p>
                    </div>
                    <div class="card" style="border-left: 4px solid #ef4444;">
                        <h3>Critical Priority</h3>
                        <p style="color: #ef4444;">${criticalBugs}</p>
                    </div>
                    <div class="card" style="border-left: 4px solid #3b82f6;">
                        <h3>Open & In Progress</h3>
                        <p>${openBugs}</p>
                    </div>
                    <div class="card" style="border-left: 4px solid #22c55e;">
                        <h3>Resolved / Closed</h3>
                        <p>${resolvedBugs}</p>
                    </div>
                </div>

                <div class="table-container">
                    <h2>⚠️ Critical Blockers Action Required</h2>
                    ${criticalBugs > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>Bug ID</th>
                                    <th>Summary</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bugs.filter((b: any) => b.severity === 'critical').slice(0, 10).map((b: any) => `
                                    <tr class="urgent-row">
                                        <td><strong><a href="${b.url || '#'}" target="_blank">${b.id}</a></strong></td>
                                        <td>${b.summary}</td>
                                        <td>${b.status}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p style="color: #15803d; font-weight: 500;">✅ No critical blockers reported.</p>'}
                </div>

                <div class="footer">
                    <p>This automated status report was generated by AI Bug Reporter.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        // Target recipients
        const toList = (process.env.REPORT_STAKEHOLDERS || process.env.SMTP_USER || 'onboarding@resend.dev').split(',').map(e => e.trim());

        // Send Email via Resend
        const { data, error: resendError } = await resend.emails.send({
            from: process.env.SMTP_FROM || 'AI Bug Reporter <onboarding@resend.dev>',
            to: toList,
            subject: `[Daily QA Report] System Health: ${passFailStatus}`,
            html: htmlPayload
        });

        if (resendError) {
            console.error("Resend API error:", resendError);
            if (resendError.name === 'validation_error') {
                return NextResponse.json({ error: 'Resend API validation error (Check domain verification)' }, { status: 403 });
            }
            throw new Error(resendError.message);
        }

        return NextResponse.json({ success: true, messageId: data?.id });

    } catch (e: any) {
        console.error("Daily Report Error:", e);
        return NextResponse.json({ error: e.message || 'Failed to generate report' }, { status: 500 });
    }
}
