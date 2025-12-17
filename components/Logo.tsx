import React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-40 h-40'
    };

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <img
                src="/assets/logo.svg"
                alt="VIEW Logo"
                className={`${sizeClasses[size]} object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]`}
            />
        </div>
    );
};

export default Logo;
