'use client';

import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function MobileMenuToggle() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsOpen(false);
                const sidebar = document.querySelector('aside[class*="sidebar"]');
                if (sidebar) sidebar.removeAttribute('style');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggle = () => {
        const sidebar = document.querySelector('aside[class*="sidebar"]');
        if (sidebar) {
            if (!isOpen) {
                sidebar.setAttribute('style', 'left: 0 !important; box-shadow: 0 0 100px rgba(0,0,0,0.8);');
            } else {
                sidebar.removeAttribute('style');
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <button 
            onClick={toggle} 
            className="mobile-hamburger"
            aria-label="Toggle menu"
        >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
    );
}
