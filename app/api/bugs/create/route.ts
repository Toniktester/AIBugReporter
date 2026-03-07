import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/utils/supabase/server';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            summary, severity, projectId, environmentInfo, consoleLogs, networkLogs,
            screenshotBase64, description, steps_to_reproduce, expected_result, actual_result, jiraStoryId
        } = body;

        if (!summary || !projectId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

        // 2. Save Bug to Supabase
        const { data: bugData, error: bugError } = await supabase
            .from('bugs')
            .insert({
                project_id: projectId,
                reporter_id: user.id,
                summary,
                severity,
                status: 'open',
                description: aiData.description,
                steps_to_reproduce: aiData.steps_to_reproduce,
                expected_result: aiData.expected_result,
                actual_result: aiData.actual_result,
                root_cause: aiData.root_cause,
                environment_info: environmentInfo || {},
                console_logs: consoleLogs || [],
                network_logs: networkLogs || []
            })
            .select()
            .single();

        if (bugError || !bugData) {
            console.error('Supabase insert error', bugError);
            return NextResponse.json({ error: 'Failed to save bug to database' }, { status: 500 });
        }

        // 3. Process Attachment Content
        let publicUrl = null;
        if (screenshotBase64) {
            try {
                const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `${bugData.id}-evid.png`;

                const { error: uploadError } = await supabase.storage
                    .from('bug-attachments')
                    .upload(fileName, buffer, { contentType: 'image/png' });

                if (!uploadError) {
                    const { data } = supabase.storage.from('bug-attachments').getPublicUrl(fileName);
                    publicUrl = data.publicUrl;

                    await supabase.from('attachments').insert({
                        bug_id: bugData.id,
                        file_url: publicUrl,
                        file_path: fileName,
                        attachment_type: 'screenshot'
                    });
                } else {
                    console.error('Attachment upload error:', uploadError);
                }
            } catch (err) {
                console.error('Failed to parse and upload base64 screenshot', err);
            }
        }

        // 4. Trigger Integrations (Teams & Jira)
        const { data: integrations } = await supabase
            .from('integrations')
            .select('*')
            .eq('project_id', projectId);

        const integrationResults = [];

        if (integrations && integrations.length > 0) {
            for (const integration of integrations) {
                if (integration.provider === 'teams' && integration.config?.webhook_url) {
                    try {
                        const teamsPayload = {
                            "@type": "MessageCard",
                            "@context": "http://schema.org/extensions",
                            "themeColor": "EF4444",
                            "summary": `New Bug Reported: ${summary}`,
                            "sections": [{
                                "activityTitle": `🚨 New ${severity.toUpperCase()} Bug Logged`,
                                "activitySubtitle": summary,
                                "facts": [
                                    { "name": "Bug ID:", "value": bugData.id },
                                    { "name": "Status:", "value": "Open" },
                                    { "name": "Root Cause Guess:", "value": aiData.root_cause || "N/A" }
                                ],
                                "markdown": true
                            }]
                        };

                        await fetch(integration.config.webhook_url, {
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

                if (integration.provider === 'jira' && integration.config?.domain) {
                    // Jira logic will go here
                    const jiraRes = await syncToJira(integration.config, bugData, aiData, jiraStoryId, screenshotBase64);
                    integrationResults.push({ provider: 'jira', ...jiraRes });
                }
            }
        }

        return NextResponse.json({ success: true, bug: bugData, integrations: integrationResults });

    } catch (error: any) {
        console.error('Bug Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// Helper to push to Jira
async function syncToJira(config: any, bug: any, aiData: any, parentStoryId: string, base64Image: string) {
    try {
        const { domain, email, apiToken, projectKey } = config;
        if (!domain || !email || !apiToken || !projectKey) return { success: false, error: 'Missing Jira config' };

        const basicAuth = Buffer.from(`${email}:${apiToken}`).toString('base64');
        const baseUrl = `https://${domain}.atlassian.net/rest/api/3`;

        const contentNodes: any[] = [];

        if (bug.description) {
            contentNodes.push({ type: "paragraph", content: [{ type: "text", text: bug.description }] });
        } else {
            contentNodes.push({ type: "paragraph", content: [{ type: "text", text: 'No description provided.' }] });
        }

        if (bug.steps_to_reproduce) {
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Steps to Reproduce" }] },
                { type: "paragraph", content: [{ type: "text", text: bug.steps_to_reproduce }] }
            );
        }

        if (bug.expected_result) {
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Expected Result" }] },
                { type: "paragraph", content: [{ type: "text", text: bug.expected_result }] }
            );
        }

        if (bug.actual_result) {
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Actual Result" }] },
                { type: "paragraph", content: [{ type: "text", text: bug.actual_result }] }
            );
        }

        if (bug.environment_info) {
            const envText = typeof bug.environment_info === 'string' ? bug.environment_info : JSON.stringify(bug.environment_info, null, 2);
            contentNodes.push(
                { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Environment Details" }] },
                { type: "codeBlock", attrs: { language: "json" }, content: [{ type: "text", text: envText }] }
            );
        }

        // 1. Create Issue
        const issuePayload: any = {
            fields: {
                project: { key: projectKey },
                summary: bug.summary,
                description: {
                    type: "doc",
                    version: 1,
                    content: contentNodes
                },
                issuetype: { name: "Bug" }
            }
        };

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
            return { success: false, error: errorMsg };
        }

        const issueKey = createData.key;

        // 1.5 Link to parent story if provided
        if (issueKey && parentStoryId) {
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
                    outwardIssue: { key: parentStoryId }
                })
            });
        }

        // 2. Post Attachment if exists
        if (issueKey && base64Image) {
            const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Reconstruct multipart form data manually since fetch doesn't support FormData with buffers natively in pure node as cleanly as the browser without external libs
            const multipartBody = Buffer.concat([
                Buffer.from(`--${boundary}\r\n`),
                Buffer.from(`Content-Disposition: form-data; name="file"; filename="screenshot.png"\r\n`),
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
        }

        return { success: true, key: issueKey };
    } catch (err: any) {
        console.error('Jira sync failed:', err);
        return { success: false, error: err.message || 'Internal Jira API error' };
    }
}
