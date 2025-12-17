import React, { useState } from 'react';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';
import { ArrowRight, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const { loginAnonymously, loginWithGoogle } = useApp();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleGuestLogin = async () => {
        setIsLoggingIn(true);
        await loginAnonymously();
        setIsLoggingIn(false);
    };

    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        await loginWithGoogle();
        setIsLoggingIn(false);
    };

    return (
        <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center relative overflow-hidden text-white font-sans">
            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-brand-800/20 rounded-full blur-[120px]" />

            <div className="z-10 flex flex-col items-center w-full max-w-md px-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <Logo size="xl" className="mb-8" />

                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-brand-300 bg-clip-text text-transparent mb-2 text-center">
                    VIEW
                </h1>
                <p className="text-gray-400 mb-12 text-center text-lg font-light">
                    The Future of Digital Rewards
                </p>

                <div className="w-full space-y-4 backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-3xl shadow-2xl">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 transition-all rounded-xl border border-white/10 flex items-center justify-center space-x-3 group"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
                        <span className="font-medium">Continue with Google</span>
                    </button>



                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#121220] px-2 text-gray-500">or</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGuestLogin}
                        disabled={isLoggingIn}
                        className="w-full py-4 px-4 bg-brand-600 hover:bg-brand-500 active:scale-[0.98] transition-all rounded-xl shadow-lg shadow-brand-900/50 flex items-center justify-center space-x-2 font-bold text-white tracking-wide"
                    >
                        {isLoggingIn ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span>Start as Guest</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>

                <p className="mt-8 text-xs text-center text-gray-600">
                    By continuing, you agree to our Terms of Service <br /> and Privacy Policy.
                </p>
            </div>
        </div>
    );
};

export default Login;
