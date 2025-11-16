import React from 'react';

export const WandIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2 18.28V22h3.72l14.92-14.92a1.21 1.21 0 0 0 0-1.72z" />
        <path d="m14 7 3 3" />
        <path d="M5 6v4" />
        <path d="M3 8h4" />
        <path d="M19 13v4" />
        <path d="M17 15h4" />
    </svg>
);
