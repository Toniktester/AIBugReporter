'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Public signup is disabled as per Version 7 (Managed Access)
        router.push('/login?message=Signup is disabled. Please contact your Admin for access.');
    }, [router]);

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            background: 'var(--bg-dark)',
            color: 'var(--text-dim)' 
        }}>
            <p>Redirecting to login...</p>
        </div>
    );
}
