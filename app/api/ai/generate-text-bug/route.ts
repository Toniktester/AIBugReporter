import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient as createJSClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { summary, jiraStoryId, backupToken } = body;

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
            console.error("Auth Error: Invalid token or missing session for AI path");
            return NextResponse.json({ 
                error: { message: "You must be logged in to generate bug reports. Token may be invalid or expired.", code: 401, status: "Unauthorized" } 
            }, { status: 401 });
        }

        // 2. Validate environment
        const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY)?.replace(/^"|"$/g, '');
        if (!apiKey) {
            console.error("AI Error: Missing API key in environment variables");
            return NextResponse.json({ 
                error: { message: "AI API Key is missing. Please configure GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY in Netlify.", code: 500, status: "Internal Server Error" } 
            }, { status: 500 });
        }

        if (!summary) {
            return NextResponse.json({ error: 'No bug summary provided' }, { status: 400 });
        }

        // Fetch Jira Story Context First
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

        // 3. Initialize Gemini
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
            You are an expert QA tester.
            ${storyContext}
            [STEP 2 - ANALYZE BUG SUMMARY]: The user described the following bug symptom: "${summary}".
            [STEP 3 - GENERATE]: Based on the Story Context (Step 1) and the Bug Summary (Step 2), automatically generate a comprehensive, structured bug report. 
            CRITICAL INSTRUCTIONS:
            1. Your generated "summary" (Bug Title) MUST be deeply contextualized by the Jira Story context (Step 1). Keep it to 1 concise sentence.
            2. Your generated "description" MUST weave in the intent of the Jira Story. Mention the Story URL if provided in Step 1.
            3. Your "steps_to_reproduce" MUST reflect steps that relate to the functionality built in the Story.
            4. Your "expected_result" MUST strongly align with the Acceptance Criteria of the Jira Story. Make intelligent deductions about the expected behavior.
            5. The "actual_result" MUST reflect the broken symptom described in the Bug Summary.
            6. Format "steps_to_reproduce" so that each numbered step is on a new line separated by a newline character (\\n).
            Return the output strictly in the following JSON schema:
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A slightly improved or corrected 1-sentence title for the bug if needed." },
                        description: { type: Type.STRING, description: "Detailed description of the presumed issue." },
                        steps_to_reproduce: { type: Type.STRING, description: "Numbered list of logical steps." },
                        expected_result: { type: Type.STRING, description: "What should logically happen." },
                        actual_result: { type: Type.STRING, description: "What is presumed to have happened based on the summary." },
                        severity: { type: Type.STRING, description: "One of: low, medium, high, critical" }
                    },
                    required: ["summary", "description", "steps_to_reproduce", "expected_result", "actual_result", "severity"]
                }
            }
        });

        if (!response.text) {
            throw new Error("Failed to generate text content from Gemini");
        }

        const jsonOutput = JSON.parse(response.text);

        return NextResponse.json({ success: true, ai_data: jsonOutput });

    } catch (e: any) {
        console.error('Gemini Text Error / Network Issue:', e);
        
        let dump = e.stack ? e.stack.toString() : "";
        let objDump = "";
        try { objDump = JSON.stringify(e); } catch(x) {}

        let errorMessage = `TRACE DUMP: Msg: ${e.message} | Name: ${e.name} | Obj: ${objDump} | Stack: ${dump.substring(0, 300)}`;
        if (e.message && e.message.includes('API key not valid')) errorMessage = 'Invalid Gemini API Key provided. Please update your environment variables.';
        
        return NextResponse.json({ 
            error: { message: errorMessage, code: 500, status: "Internal Server Error" } 
        }, { status: 500 });
    }
}
