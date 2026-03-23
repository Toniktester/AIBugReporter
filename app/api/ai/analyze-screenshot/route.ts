import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        // 1. Authenticate user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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

        const body = await req.json();
        const { imagesBase64, summary, jiraStoryId } = body;

        if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
            return NextResponse.json({ error: 'No images provided' }, { status: 400 });
        }

        // 3. Initialize Gemini (Lazy load to ensure fresh Env Vars)
        const ai = new GoogleGenAI({ apiKey });

        let storyContext = "";
        if (jiraStoryId) {
            try {
                const { data: integrations } = await supabase.from('integrations').select('*').eq('provider', 'jira').limit(1);
                const jiraConf = integrations?.[0]?.config;
                if (jiraConf && jiraConf.domain) {
                    const basicAuth = Buffer.from(`${jiraConf.email}:${jiraConf.apiToken}`).toString('base64');
                    const url = `https://${jiraConf.domain}.atlassian.net/rest/api/3/issue/${jiraStoryId}`;
                    const r = await fetch(url, { headers: { 'Authorization': `Basic ${basicAuth}`, 'Accept': 'application/json' }});
                    if (r.ok) {
                        const storyData = await r.json();
                        const s_summary = storyData.fields.summary || '';
                        let s_desc = '';
                        if (storyData.fields.description && storyData.fields.description.content) {
                            s_desc = JSON.stringify(storyData.fields.description.content);
                        } else if (typeof storyData.fields.description === 'string') {
                            s_desc = storyData.fields.description;
                        }
                        storyContext = `\nSTORY CONTEXT:\nThe user is testing this specific Jira Story: ${jiraStoryId} - ${s_summary}\nDescription details: ${s_desc.substring(0, 1000)}\nPlease ensure the generated expected vs actual results heavily refer to this story's acceptance criteria!`;
                    }
                }
            } catch(e) { console.error("Failed fetching Jira Story context", e) }
        }

        const prompt = `
            You are an expert QA tester. Analyze the provided screenshot(s) of a web application and identify any bugs, UI glitches, or errors.
            ${summary ? `User provided hint/summary: ${summary}` : ''}
            ${storyContext}
            Based on the visual evidence ${storyContext ? 'and the Story Criteria' : ''}, automatically generate a bug report.
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
