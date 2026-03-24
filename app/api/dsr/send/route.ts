import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { fetchJiraBugs } from '@/utils/jira';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_NnRCmKsP_PiYkcSE5oEtwgi6WTKnnW6Vy');

// Helper to generate the exact HTML
function generateDSRHtml(config: any, bugs: any[]) {
    const totalBugs = bugs.length;
    const criticalBugs = bugs.filter(b => b.severity === 'critical').length;
    const highBugs = bugs.filter(b => b.severity === 'high').length;
    const openBugs = bugs.filter(b => ['open', 'in_progress', 'To Do', 'In Progress'].includes(b.status)).length;
    const closedBugs = totalBugs - openBugs;
    
    const passFailStatus = criticalBugs > 0 ? 'CRITICAL RISK 🔴' : (openBugs > 5 ? 'WARNING 🟡' : 'HEALTHY 🟢');

    // Calculate a rough pass/fail trend
    const passRate = totalBugs > 0 ? Math.round((closedBugs / totalBugs) * 100) : 100;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; }
            .container { max-width: 700px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 6px solid #6366f1; }
            h1 { color: #0f172a; margin-top: 0; }
            .user-content { padding: 15px; background: #f1f5f9; border-left: 4px solid #8b5cf6; border-radius: 4px; margin-bottom: 25px; white-space: pre-wrap; color: #334155; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 999px; font-weight: bold; font-size: 14px; background: #f1f5f9; color: #334155; margin-bottom: 25px; }
            .status-badge.critical { background: #fee2e2; color: #b91c1c; }
            .status-badge.healthy { background: #dcfce3; color: #15803d; }
            .status-badge.warning { background: #fef9c3; color: #a16207; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
            .card h3 { margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-transform: uppercase; }
            .card p { margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; }
            .charts-row { display: flex; gap: 15px; margin-bottom: 30px; text-align: left; }
            .chart-box { flex: 1; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
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
            <h1>${config.subject || 'Daily Quality Status Report'}</h1>
            
            ${config.content ? `<div class="user-content">${config.content}</div>` : ''}

            <div class="status-badge ${criticalBugs > 0 ? 'critical' : (openBugs > 5 ? 'warning' : 'healthy')}">
                Overall System Health: ${passFailStatus}
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
                    <h3>Open & Triaging</h3>
                    <p>${openBugs}</p>
                </div>
                <div class="card" style="border-left: 4px solid #22c55e;">
                    <h3>Resolved (Pass Trend)</h3>
                    <p style="color: #22c55e;">${passRate}%</p>
                </div>
            </div>

            <!-- Priority Breakdown List instead of JS charts due to email client constraints -->
            <div class="charts-row">
                <div class="chart-box">
                    <h3 style="margin-top: 0; color: #475569; font-size: 14px; text-transform: uppercase;">Bug Priority Distribution</h3>
                    <ul style="padding-left: 20px; color: #334155; font-size: 14px;">
                        <li><strong>Critical:</strong> ${criticalBugs}</li>
                        <li><strong>High:</strong> ${highBugs}</li>
                        <li><strong>Medium:</strong> ${bugs.filter(b => b.severity === 'medium').length}</li>
                        <li><strong>Low:</strong> ${bugs.filter(b => b.severity === 'low').length}</li>
                    </ul>
                </div>
            </div>

            <div class="table-container">
                <h2 style="color: #0f172a; font-size: 18px;">⚠️ Immediate Blockers & Priorities</h2>
                ${(criticalBugs > 0 || highBugs > 0) ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Issue Key</th>
                                <th>Summary</th>
                                <th>Priority</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bugs.filter((b: any) => b.severity === 'critical' || b.severity === 'high').slice(0, 10).map((b: any) => `
                                <tr class="${b.severity === 'critical' ? 'urgent-row' : ''}">
                                    <td><strong><a href="${b.url || '#'}" target="_blank">${b.id}</a></strong></td>
                                    <td>${b.title}</td>
                                    <td><span style="color: ${b.severity === 'critical' ? '#ef4444' : '#f59e0b'}; font-weight: bold;">${b.severity.toUpperCase()}</span></td>
                                    <td>${b.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="color: #15803d; font-weight: 500;">✅ Excellent! No high or critical blockers reported.</p>'}
            </div>

            <div class="footer">
                <p>This automated status report was generated and dispatched by AI Bug Reporter (using Resend).</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const config = body.configOverride;
        
        if (!config || !config.to) {
            return NextResponse.json({ error: 'Missing configuration or valid recipients in "To" field' }, { status: 400 });
        }

        const toList = config.to.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        const ccList = config.cc ? config.cc.split(',').map((e: string) => e.trim()).filter((e: string) => e) : [];
        const bccList = config.bcc ? config.bcc.split(',').map((e: string) => e.trim()).filter((e: string) => e) : [];

        if (toList.length === 0) return NextResponse.json({ error: 'No valid "To" recipients provided' }, { status: 400 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const sbAdmin = createAdminClient(supabaseUrl!, supabaseServiceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
        
        // Fetch underlying project data to embed
        const { bugs } = await fetchJiraBugs(sbAdmin as any);
        if (!bugs) throw new Error('Failed to extract data payload for DSR.');

        const html = generateDSRHtml(config, bugs);

        // Dispatch via Resend API
        const { data, error } = await resend.emails.send({
            from: 'AI Bug Reporter <onboarding@resend.dev>',
            to: toList,
            cc: ccList.length > 0 ? ccList : undefined,
            bcc: bccList.length > 0 ? bccList : undefined,
            subject: config.subject,
            html: html
        });

        if (error) {
            console.error("Resend API rejection:", error);
            // 403 on resend usually signals unverified domain - since this is a test we use onboarding@resend.dev
            if (error.name === 'validation_error' && error.message.includes('domain')) {
                return NextResponse.json({ error: 'Resend API requires a verified domain to dispatch to arbitrary emails, or you must be sending to the email registered with Resend!' }, { status: 403 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, resendId: data?.id });
    } catch (e: any) {
        console.error("DSR Engine Error:", e);
        return NextResponse.json({ error: e.message || 'Fatal Dispatch Error' }, { status: 500 });
    }
}
