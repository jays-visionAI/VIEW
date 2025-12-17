import React, { useEffect, useState } from 'react';
import Logo from './Logo';

const SplashScreen: React.FC = () => {
    const [show, setShow] = useState(true);

    // Fallback timeout in case auth takes too long, but main control is from parent
    // This helps visually if checking is super fast
    useEffect(() => {
        const timer = setTimeout(() => {
            // Animation cleanup if needed
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0a12] text-white">
            <div className="animate-pulse">
                <Logo size="xl" />
            </div>
            <div className="mt-8 text-brand-300 font-light tracking-[0.2em] text-sm animate-bounce">
                INITIALIZING SYSTEM
            </div>
        </div>
    );
};

export default SplashScreen;
