import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const title = formData.get('title') as string;
        const text = formData.get('text') as string;
        const images = formData.getAll('images') as File[];

        const base64Images: string[] = [];

        // Buffer streaming logic for Serverless edges
        for (const file of images) {
            if (file && file.size > 0 && file.type) {
                const buffer = await file.arrayBuffer();
                const base64Str = Buffer.from(buffer).toString('base64');
                const mimeType = file.type || 'image/png';
                base64Images.push(`data:${mimeType};base64,${base64Str}`);
            }
        }

        // Return a self-executing HTML snippet
        // This acts as a bridge to move the uploaded serverless assets securely into the browser's localStorage context 
        // to immediately pipe them to the Client Form Component.
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Processing Shared Snippets...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #0A0C10; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; margin: 0; }
                .spinner { animation: spin 1s linear infinite; margin: 0 auto 15px; display: block; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .text { text-align: center; color: #94a3b8; font-size: 14px; font-weight: 500; }
            </style>
        </head>
        <body>
            <div>
                <svg class="spinner" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <div class="text">Processing Shared Bug Data...</div>
            </div>
            <script>
                try {
                    const sharedImages = ${JSON.stringify(base64Images)};
                    const sharedText = ${JSON.stringify(text || title || '')};
                    
                    if (sharedImages && sharedImages.length > 0) {
                        localStorage.setItem('pwa_shared_images', JSON.stringify(sharedImages));
                    }
                    if (sharedText) {
                        localStorage.setItem('pwa_shared_text', sharedText);
                    }
                } catch(e) {
                    console.error('Failed to stash shared assets to local schema', e);
                }
                
                // Route safely internally automatically
                setTimeout(() => {
                    window.location.href = '/bugs/new';
                }, 500);
            </script>
        </body>
        </html>
        `;

        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html' }
        });

    } catch (e: any) {
        console.error("PWA POST Share Target Error:", e);
        return NextResponse.redirect(new URL('/bugs/new?error=share_failed', req.url));
    }
}
