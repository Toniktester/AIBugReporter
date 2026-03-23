import './globals.css'
import type { Metadata } from 'next'
import PWARegister from '@/components/PWARegister'

export const metadata: Metadata = {
    title: 'AI Bug Reporter - Smarter QA',
    description: 'Report bugs in under 10 seconds with AI',
    manifest: '/manifest.json',
    icons: {
        icon: '/logo.png',
        shortcut: '/logo.png',
        apple: '/logo.png',
    }
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <PWARegister />
                {children}
            </body>
        </html>
    )
}
