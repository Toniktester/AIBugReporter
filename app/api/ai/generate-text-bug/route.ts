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
                error: { message: "You must be logged in to generate bug reports", code: 401, status: "Unauthorized" } 
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
        const { summary } = body;

        if (!summary) {
            return NextResponse.json({ error: 'No bug summary provided' }, { status: 400 });
        }

        // 3. Initialize Gemini
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
            You are an expert QA tester. You have been given a brief, single-line summary of a software bug: "${summary}".
            Based on this short summary, automatically generate a comprehensive, structured bug report.
            Make intelligent assumptions about the typical steps to reproduce, expected results, and actual results for this type of issue.
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
        console.error('Gemini Text Error:', e);
        return NextResponse.json({ 
            error: { message: e.message || 'Failed to generate bug report from text', code: 500, status: "Internal Server Error" } 
        }, { status: 500 });
    }
}
