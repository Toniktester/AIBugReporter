'use client';

import { useEffect } from 'react';

export default function PWARegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => console.log('PWA Service Worker registered', reg))
                .catch((err) => console.error('PWA Service Worker registration failed', err));
        }
    }, []);
    return null;
}
