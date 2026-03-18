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
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ 
                error: { message: "Gemini API Key is not configured in Netlify environment variables.", code: 500, status: "Internal Server Error" } 
            }, { status: 500 });
        }

        const body = await req.json();
        const { imageBase64 } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // 3. Initialize Gemini (Lazy load to ensure fresh Env Vars)
        const ai = new GoogleGenAI({ apiKey });
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        const prompt = `
            You are an expert QA tester. Analyze this screenshot of a web application and identify any bugs, UI glitches, or errors.
            Based on the visual evidence, automatically generate a bug report.
            Return the output strictly in the following JSON schema:
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { data: base64Data, mimeType: 'image/png' } }
                    ]
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
