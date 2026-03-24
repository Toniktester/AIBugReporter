import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient as createJSClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imagesBase64, summary, jiraStoryId, backupToken } = body;

        const authHeader = req.headers.get('Authorization');
        let token: string | undefined = backupToken;
        if (!token && authHeader) {
            token = authHeader.replace('Bearer ', '');
        }
        
        // Pure stateless auth verification bypassing SSR edge cookies
        const supabase = createJSClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false } }
        );

        const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ 
                error: { message: "You must be logged in to analyze screenshots", code: 401, status: "Unauthorized" } 
            }, { status: 401 });
        }

        // 2. Validate environment
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.replace(/^"|"$/g, '');
        if (!apiKey) {
            return NextResponse.json({ 
                error: { message: "Gemini API Key is not configured in Netlify environment variables.", code: 500, status: "Internal Server Error" } 
            }, { status: 500 });
        }

        // Proceed into Gemini Logic

        if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
            return NextResponse.json({ error: 'No images provided' }, { status: 400 });
        }

        // 3. Initialize Gemini (Lazy load to ensure fresh Env Vars)
        const ai = new GoogleGenAI({ apiKey });

        let storyContext = "";
        if (jiraStoryId) {
            try {
                let cleanStoryId = jiraStoryId.trim();
                let match = cleanStoryId.match(/selectedIssue=([A-Za-z0-9-]+)/);
                if (match) cleanStoryId = match[1];
                else {
                    match = cleanStoryId.match(/browse\/([A-Za-z0-9-]+)/);
                    if (match) cleanStoryId = match[1];
                }

                const { data: integrations } = await supabase.from('integrations').select('*').eq('provider', 'jira').limit(1);
                const jiraConf = integrations?.[0]?.config;
                if (jiraConf && jiraConf.domain) {
                    const basicAuth = Buffer.from(`${jiraConf.email}:${jiraConf.apiToken}`).toString('base64');
                    const url = `https://${jiraConf.domain}.atlassian.net/rest/api/3/issue/${cleanStoryId}`;
                    const r = await fetch(url, { headers: { 'Authorization': `Basic ${basicAuth}`, 'Accept': 'application/json' }});
                    if (r.ok) {
                        const storyData = await r.json();
                        const s_summary = storyData.fields.summary || '';
                        let s_desc = '';
                        if (storyData.fields.description?.content) {
                            const extractText = (nodes: any[]): string => nodes.map((n:any) => (n.text ? n.text : (n.content ? extractText(n.content) : ''))).join(' ');
                            s_desc = extractText(storyData.fields.description.content);
                        } else if (typeof storyData.fields.description === 'string') {
                            s_desc = storyData.fields.description;
                        }
                        
                        const projectKey = cleanStoryId.split('-')[0];
                        const fullStoryUrl = `https://${jiraConf.domain}.atlassian.net/jira/software/projects/${projectKey}/boards/2?selectedIssue=${cleanStoryId}`;

                        storyContext = `\n[STEP 1 - READ STORY CONTEXT]:\nStory Key: ${cleanStoryId}\nStory URL: ${fullStoryUrl}\nStory Title: ${s_summary}\nAcceptance Criteria / Details: ${s_desc.substring(0, 3000)}\n\n`;
                    }
                }
            } catch(e) { console.error("Failed fetching Jira Story context", e) }
        }

        const prompt = `
            You are an expert QA tester.
            ${storyContext}
            [STEP 2 - ANALYZE EVIDENCE]: Analyze the provided screenshot(s) of the web application. ${summary ? `Also refer to the user's manual hint: "${summary}".` : ''} Identify any UI glitches, errors, or deviations visually.
            [STEP 3 - GENERATE]: Automatically generate a bug report based on the evidence AND the Jira Story context provided in Step 1.
            CRITICAL INSTRUCTIONS:
            1. Your generated "summary" (Bug Title) MUST be related to and contextualized by the Jira Story context.
            2. Your generated "description" MUST reference the intent of the Jira Story. Include the Story URL if provided.
            3. Your "steps_to_reproduce" MUST align with the functionality described in the Story.
            4. Your "expected_result" MUST strongly align with the Acceptance Criteria of the Jira Story context.
            5. The "actual_result" MUST reflect the visual failure shown in the screenshot(s) or summarized by the user.
            6. Format "steps_to_reproduce" so that each numbered step is on a new line separated by a newline character (\\n).
            Return the output strictly in the following JSON schema:
        `;

        const parts: any[] = [{ text: prompt }];

        imagesBase64.forEach((b64: string) => {
            const bData = b64.replace(/^data:image\/\w+;base64,/, "");
            parts.push({ inlineData: { data: bData, mimeType: 'image/png' } });
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: parts
                }
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A concise, 1-sentence title for the bug." },
                        description: { type: Type.STRING, description: "Detailed description of the issue." },
                        steps_to_reproduce: { type: Type.STRING, description: "Numbered list of steps." },
                        expected_result: { type: Type.STRING, description: "What should have happened." },
                        actual_result: { type: Type.STRING, description: "What visually happened." },
                        severity: { type: Type.STRING, description: "One of: low, medium, high, critical" }
                    },
                    required: ["summary", "description", "steps_to_reproduce", "expected_result", "actual_result", "severity"]
                }
            }
        });

        if (!response.text) {
            throw new Error("Failed to generate content from Gemini");
        }

        const jsonOutput = JSON.parse(response.text);

        return NextResponse.json({ success: true, ai_data: jsonOutput });

    } catch (e: any) {
        console.error('Gemini Vision Error:', e);
        return NextResponse.json({ 
            error: { message: e.message || 'Failed to analyze screenshot', code: 500, status: "Internal Server Error" } 
        }, { status: 500 });
    }
}
