import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const sbAdmin = createAdminClient(supabaseUrl!, supabaseServiceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

        // Retrieve current hour-minute
        const now = new Date();
        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMin = String(now.getMinutes()).padStart(2, '0');
        const searchTime = `${currentHour}:${currentMin}`;

        // Fetch configs where enabled = true globally across all projects
        const { data: configs } = await sbAdmin
            .from('integrations')
            .select('*')
            .eq('provider', 'dsr_email');

        if (!configs || configs.length === 0) {
            return NextResponse.json({ message: 'No DSR integrations exist in DB' });
        }

        let sentCount = 0;
        
        // Loop through and fire off configured dispatches
        for (const cfg of configs) {
            const params = cfg.config;
            if (params && params.enabled && params.time === searchTime) {
                // Trigger the internal send process
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
                try {
                    await fetch(`${baseUrl}/api/dsr/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ configOverride: params })
                    });
                    sentCount++;
                } catch(e) {
                    console.error("Cron failed to dispatch for ID", cfg.id, e);
                }
            }
        }

        return NextResponse.json({ success: true, processed: sentCount, timeChecked: searchTime });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
