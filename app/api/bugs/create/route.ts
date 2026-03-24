import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/utils/supabase/server';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const body = await req.json();
        const { backupToken } = body;

        // Explicit fallback for Netlify cross-origin / edge cookie drops
        const authHeader = req.headers.get('Authorization');
        let token: string | undefined = backupToken;
        if (!token && authHeader) {
            token = authHeader.replace('Bearer ', '');
        }

        const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request (using the already parsed 'body' variable)
        const {
            summary, severity, environmentInfo, consoleLogs, networkLogs,
            screenshotsBase64, description, steps_to_reproduce, expected_result, actual_result, jiraStoryId,
            // V10 new fields
            startDate, dueDate, fixVersion, releaseVersion, labels, assignedTo, postInTeams
        } = body;

        if (!summary) {
            return NextResponse.json({ error: 'Missing required field: summary' }, { status: 400 });
        }

        // 1. Resolve AI Fields
        // If the user used the screenshot auto-fill, these are populated.
        // If not, we fall back to a quick text-only Gemini generation.
        let aiData = {
            description: description || '',
            steps_to_reproduce: steps_to_reproduce || '',
            expected_result: expected_result || '',
            actual_result: actual_result || '',
            root_cause: 'Pending analysis'
        };

        if (!description) {
            const aiPrompt = `You are an expert QA tester. Analyze the following bug summary and generate a structured bug report strictly in JSON format.
            Summary: ${summary}
            Keys requested: "description", "steps_to_reproduce", "expected_result", "actual_result", "root_cause"`;

            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
                    config: { responseMimeType: "application/json" }
                });
                const parsed = JSON.parse(response.text || '{}');
                aiData = { ...aiData, ...parsed };
            } catch (e) {
                console.error("Text-only AI fallback failed", e);
            }
        }

        // 2. Fetch Integrations (Jira is required now)
        const { data: integrations } = await supabase
            .from('integrations')
            .select('*');

        const jiraIntegration = integrations?.find(i => i.provider === 'jira');
        const teamsIntegration = integrations?.find(i => i.provider === 'teams');

        if (!jiraIntegration || !jiraIntegration.config?.domain) {
            return NextResponse.json({ error: 'Jira integration is required but not configured for this project.' }, { status: 400 });
        }

        const jiraConfig = jiraIntegration.config;
        const basicAuth = Buffer.from(`${jiraConfig.email}:${jiraConfig.apiToken}`).toString('base64');
        const baseUrl = `https://${jiraConfig.domain}.atlassian.net/rest/api/3`;

        let assigneeAccountId = null;
        if (assignedTo) {
            try {
                const { createClient: createAdminClient } = require('@supabase/supabase-js');
                const sbAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^"|"$/g, '') || '', process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^"|"$/g, '') || '', {
                    auth: { autoRefreshToken: false, persistSession: false }
                });
                
                const { data: userProfile } = await sbAdmin.from('users').select('email').eq('id', assignedTo).single();
                
                if (userProfile?.email) {
                    const searchUrl = `https://${jiraConfig.domain}.atlassian.net/rest/api/3/user/search?query=${encodeURIComponent(userProfile.email)}`;
                    const userRes = await fetch(searchUrl, {
                        headers: {
                            'Authorization': `Basic ${basicAuth}`,
                            'Accept': 'application/json'
                        }
                    });
                    if (userRes.ok) {
                        const usersData = await userRes.json();
                        if (usersData && usersData.length > 0) {
                            assigneeAccountId = usersData[0].accountId;
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to resolve assignee account ID:", e);
            }
        }

        // 3. Duplicate Search
        try {
            const escapedSummary = summary.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
            // Using a simple text search for duplicates
            const jql = `project = "${jiraConfig.projectKey}" AND summary ~ "${escapedSummary}"`;

            const qs = `jql=${encodeURIComponent(jql)}&maxResults=5&fields=summary,status`;
            const searchRes = await fetch(`${baseUrl}/search/jql?${qs}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Accept': 'application/json'
                }
            });

            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.issues && searchData.issues.length > 0) {
                    return NextResponse.json({ error: 'A duplicate bug with a similar summary already exists in Jira.' }, { status: 400 });
                }
            }
        } catch (e) {
            console.error("Duplicate search failed:", e);
            // Continue if search fails as it might just be a parse error
        }

        // 4. Create Issue in Jira
        const contentNodes: any[] = [];

        const metadataLines = [];
        if (fixVersion) metadataLines.push(`**Fix Version:** ${fixVersion}`);
        if (releaseVersion) metadataLines.push(`**Release Version:** ${releaseVersion}`);
        
        if (metadataLines.length > 0) {
            contentNodes.push({ type: "paragraph", content: [{ type: "text", text: metadataLines.join(' | ') }] });
            contentNodes.push({ type: "rule" });
        }

        if (aiData.description || description) {
            contentNodes.push({ type: "paragraph", content: [{ type: "text", text: aiData.description || description || 'No description provided.' }] });
        }

        if (aiData.steps_to_reproduce || steps_to_reproduce) {
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Steps to Reproduce" }] },
                { type: "paragraph", content: [{ type: "text", text: aiData.steps_to_reproduce || steps_to_reproduce }] }
            );
        }

        if (aiData.expected_result || expected_result) {
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Expected Result" }] },
                { type: "paragraph", content: [{ type: "text", text: aiData.expected_result || expected_result }] }
            );
        }

        if (aiData.actual_result || actual_result) {
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Actual Result" }] },
                { type: "paragraph", content: [{ type: "text", text: aiData.actual_result || actual_result }] }
            );
        }

        if (environmentInfo) {
            const envText = typeof environmentInfo === 'string' ? environmentInfo : JSON.stringify(environmentInfo, null, 2);
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Environment Details" }] },
                { type: "codeBlock", attrs: { language: "json" }, content: [{ type: "text", text: envText }] }
            );
        }

        let priorityName = "Medium";
        if (severity?.toLowerCase() === 'critical') priorityName = "Highest";
        else if (severity?.toLowerCase() === 'high') priorityName = "High";
        else if (severity?.toLowerCase() === 'medium') priorityName = "Medium";
        else if (severity?.toLowerCase() === 'low') priorityName = "Lowest";

        const issuePayload: any = {
            fields: {
                project: { key: jiraConfig.projectKey },
                summary: summary,
                priority: { name: priorityName },
                description: {
                    type: "doc",
                    version: 1,
                    content: contentNodes
                },
                issuetype: { name: "Bug" }
            }
        };

        const reporterLabel = `reporter_${user.id.replace(/-/g, '')}`;
        issuePayload.fields.labels = labels && labels.length > 0 ? [...labels, reporterLabel] : [reporterLabel];

        if (dueDate) issuePayload.fields.duedate = dueDate;
        if (assigneeAccountId) issuePayload.fields.assignee = { accountId: assigneeAccountId };
        if (startDate) issuePayload.fields.customfield_10015 = startDate;

        let issueKey = null;
        try {
            const createRes = await fetch(`${baseUrl}/issue`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(issuePayload)
            });

            const createData = await createRes.json();

            if (!createRes.ok) {
                let errorMsg = 'Failed to create Jira issue';
                if (createData.errors && Object.keys(createData.errors).length > 0) {
                    errorMsg = Object.values(createData.errors).join(', ');
                } else if (createData.errorMessages && createData.errorMessages.length > 0) {
                    errorMsg = createData.errorMessages.join(', ');
                }

                // Translate known Chinese localized API errors from Jira
                if (createRes.status === 401 || createRes.status === 403) {
                    if (errorMsg.includes('您无权在此项目中创建事务') || errorMsg.includes('permission')) {
                        errorMsg = 'You do not have permission to create issues in this Jira project. Please contact your Jira administrator.';
                    } else {
                        errorMsg = 'Jira Authentication Failed: Please check your Token and Jira permissions.';
                    }
                } else if (errorMsg.includes('指定有效的事务类型') || errorMsg.includes('issue type')) {
                    errorMsg = 'Jira Error: Specify a valid issue type. The application requires an issue type exactly named "Bug" to exist in your Jira project.';
                } else if (/[\u4e00-\u9fa5]/.test(errorMsg)) {
                     // Generic catchall for other Chinese errors
                     errorMsg = 'Jira configuration error occurred. Please check project settings.';
                }

                return NextResponse.json({ error: errorMsg }, { status: 400 });
            }

            issueKey = createData.key;
        } catch (e) {
            console.error("Jira create issue error", e);
            return NextResponse.json({ error: 'Internal Jira API error' }, { status: 500 });
        }

        // 5. Link to Parent Story if provided
        if (issueKey && jiraStoryId) {
            try {
                await fetch(`${baseUrl}/issueLink`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${basicAuth}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        type: { name: "Relates" },
                        inwardIssue: { key: issueKey },
                        outwardIssue: { key: jiraStoryId }
                    })
                });
            } catch (e) {
                console.error("Jira linking error", e);
            }
        }

        // 6. Push Attachments to Jira
        if (issueKey && screenshotsBase64 && screenshotsBase64.length > 0) {
            for (let i = 0; i < screenshotsBase64.length; i++) {
                try {
                    const base64Str = screenshotsBase64[i];
                    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
                    const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');

                    const multipartBody = Buffer.concat([
                        Buffer.from(`--${boundary}\r\n`),
                        Buffer.from(`Content-Disposition: form-data; name="file"; filename="screenshot_${i+1}.png"\r\n`),
                        Buffer.from('Content-Type: image/png\r\n\r\n'),
                        buffer,
                        Buffer.from(`\r\n--${boundary}--\r\n`)
                    ]);

                    await fetch(`${baseUrl}/issue/${issueKey}/attachments`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${basicAuth}`,
                            'X-Atlassian-Token': 'no-check',
                            'Content-Type': `multipart/form-data; boundary=${boundary}`
                        },
                        body: multipartBody
                    });
                } catch (e) {
                    console.error("Jira attachment error", e);
                }
            }
        }

        // 7. Notification Logic (V8 Rules)
        const integrationResults: any[] = [{ provider: 'jira', success: true, key: issueKey }];
        const isCritical = severity.toLowerCase() === 'critical';

        // Rule: Critical Issue Alerts are sent only to Microsoft Teams. 
        // Do not send Critical Alerts via Email/Outlook.
        
        const teamsWebhookUrl = teamsIntegration?.config?.webhook_url || process.env.TEAMS_WEBHOOK_URL;

        if (teamsWebhookUrl && (isCritical || postInTeams)) {
            try {
                const teamsPayload = {
                    "@type": "MessageCard",
                    "@context": "http://schema.org/extensions",
                    "themeColor": isCritical ? "FF0000" : "EF4444",
                    "summary": `${isCritical ? '🛑 CRITICAL:' : 'New Bug:'} ${summary}`,
                    "sections": [{
                        "activityTitle": `${isCritical ? '🛑 CRITICAL' : '🚨 New'} ${severity.toUpperCase()} Bug Logged`,
                        "activitySubtitle": summary,
                        "facts": [
                            { "name": "Jira Key:", "value": issueKey },
                            { "name": "Status:", "value": "Open" },
                            { "name": "Priority:", "value": severity.toUpperCase() },
                            { "name": "Root Cause Guess:", "value": aiData.root_cause || "N/A" }
                        ],
                        "markdown": true
                    }],
                    "potentialAction": [{
                        "@type": "OpenUri",
                        "name": "View in Jira",
                        "targets": [{ "os": "default", "uri": `https://${jiraConfig.domain}.atlassian.net/browse/${issueKey}` }]
                    }]
                };

                await fetch(teamsWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(teamsPayload)
                });
                integrationResults.push({ provider: 'teams', success: true });
            } catch (e: any) {
                console.error('Teams webhook error:', e);
                integrationResults.push({ provider: 'teams', success: false, error: e.message });
            }
        }

        // Rule: Outlook/Email notifications are SKIPPED for Critical bugs (Teams only override)
        const outlookIntegration = integrations?.find(i => i.provider === 'outlook');
        if (outlookIntegration && outlookIntegration.config?.webhook_url && !isCritical) {
            try {
                await fetch(outlookIntegration.config.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject: `Bug Reported: ${summary}`,
                        body: `A new ${severity} bug has been logged in Jira: ${issueKey}`,
                        link: `https://${jiraConfig.domain}.atlassian.net/browse/${issueKey}`
                    })
                });
                integrationResults.push({ provider: 'outlook', success: true });
            } catch (e: any) {
                console.error('Outlook webhook error:', e);
                integrationResults.push({ provider: 'outlook', success: false, error: e.message });
            }
        }

        // Return pseudo bug object for frontend redirection.
        revalidatePath('/dashboard', 'layout');
        revalidatePath('/dashboard/lead');
        return NextResponse.json({ success: true, bug: { id: issueKey }, integrations: integrationResults });
    } catch (error: any) {
        console.error('Bug Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
