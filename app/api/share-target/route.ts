import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('images') as File[];
        const title = formData.get('title');
        const text = formData.get('text');

        const base64Images = [];
        for (const file of files) {
            if (file && file.size > 0 && file.type.startsWith('image/')) {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
                base64Images.push(base64);
            }
        }

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Processing Share...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="background: #0A0C10; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; gap: 1rem;">
            <div style="width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            <h2>Importing from device...</h2>
            <script>
                try {
                    const images = ${JSON.stringify(base64Images)};
                    const text = ${JSON.stringify(text || '')};
                    const title = ${JSON.stringify(title || '')};
                    
                    if (images.length > 0) {
                        localStorage.setItem('pwa_shared_images', JSON.stringify(images));
                    }
                    if (text || title) {
                        localStorage.setItem('pwa_shared_text', text || title);
                    }
                    
                    window.location.href = '/bugs/new';
                } catch (e) {
                    document.body.innerHTML = '<h2>Error processing shared files. They might be too large.</h2><br/><a href="/bugs/new" style="color: #6366f1">Return to Bug Reporter</a>';
                }
            </script>
        </body>
        </html>
        `;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (e) {
        console.error("Share target processing failed:", e);
        return NextResponse.redirect(new URL('/bugs/new', req.url));
    }
}
