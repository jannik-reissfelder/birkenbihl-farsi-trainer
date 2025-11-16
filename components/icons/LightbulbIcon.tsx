import React from 'react';

export const LightbulbIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M9 18h6"></path>
        <path d="M10 22h4"></path>
        <path d="M12 14a6 6 0 0 0 4.9-9.1A5 5 0 0 0 12 2a5 5 0 0 0-5 5c0 1.4.5 2.7 1.3 3.6"></path>
        <path d="m12 14-1.5 3"></path>
        <path d="m12 14 1.5 3"></path>
    </svg>
);
