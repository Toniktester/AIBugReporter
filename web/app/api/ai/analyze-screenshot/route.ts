import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini SDK
// Note: We need a valid Gemini API Key in .env.local
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64 } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // The input base64 might have the data URI prefix (e.g., data:image/png;base64,...)
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
        return NextResponse.json({ error: e.message || 'Failed to analyze screenshot' }, { status: 500 });
    }
}
