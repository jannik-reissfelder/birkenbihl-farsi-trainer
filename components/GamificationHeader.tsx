import React, { useContext, useState, useEffect } from 'react';
import { GamificationContext } from '../contexts/GamificationContext';
import { StarIcon } from './icons/StarIcon';
import { FireIcon } from './icons/FireIcon';
import { useAuth } from '../src/contexts/AuthContext';
import { LogOut } from 'lucide-react';

const GamificationHeader: React.FC = () => {
    const { xp, streak } = useContext(GamificationContext);
    const { signOut } = useAuth();
    const [isAnimating, setIsAnimating] = useState(false);
    const prevXpRef = React.useRef(xp);

    useEffect(() => {
        if (xp > prevXpRef.current) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 300); // Animation duration
            prevXpRef.current = xp;
            return () => clearTimeout(timer);
        }
    }, [xp]);

    const animationClass = isAnimating ? 'animate-pulse-quick' : '';

    const handleSignOut = async () => {
        if (confirm('Möchtest du dich wirklich abmelden?')) {
            try {
                await signOut();
            } catch (error) {
                console.error('Logout failed:', error);
            }
        }
    };

    return (
        <div className="flex items-center gap-4 text-white font-semibold">
            <div className={`flex items-center gap-2 p-2 rounded-lg bg-yellow-500/20 transition-transform duration-300 ${animationClass}`}>
                <StarIcon className="text-yellow-400" />
                <span className="text-yellow-300">{xp}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/20">
                <FireIcon className="text-orange-400" />
                <span className="text-orange-300">{streak}</span>
            </div>
            <button
                onClick={handleSignOut}
                className="flex items-center gap-2 p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                title="Abmelden"
            >
                <LogOut className="h-5 w-5 text-red-400" />
            </button>
            <style>{`
                @keyframes pulse-quick {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4);
                    }
                    50% {
                        transform: scale(1.1);
                        box-shadow: 0 0 10px 5px rgba(234, 179, 8, 0);
                    }
                }
                .animate-pulse-quick {
                    animation: pulse-quick 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default GamificationHeader;