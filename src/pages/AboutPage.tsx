import { useState, useEffect } from 'react';
import { Mail, MessageSquare, ExternalLink, Sparkles, Gamepad2, Maximize2 } from 'lucide-react';
import profileImage from '/profile.png';

interface AboutPageProps {
    onStartGame?: () => void;
}

export default function AboutPage({ onStartGame }: AboutPageProps) {
    const [isVisible, setIsVisible] = useState(false);
    // ... (rest of state)
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        // Trigger animations after mount
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // ... (rest of developerInfo)

    // ============================================
    // 👇 EDIT YOUR DETAILS HERE 👇
    // ============================================
    const developerInfo = {
        name: "Uday Kiran Tentu",
        title: "Full Stack Developer",
        bio: "Passionate developer creating tools that make developers' lives easier. I love building intuitive applications with modern web technologies.",
        // Replace with your actual image URL or import a local image
        imageUrl: profileImage, // Imported from public folder - Vite handles base path automatically
        initials: "TUK", // Used when imageUrl is empty
        email: "uday.kiran.tentu@citi.com",
        teamsUrl: "https://teams.microsoft.com/l/chat/0/0?users=uday.kiran.tentu@citi.com",
    };
    // ============================================

    const [isExpanded, setIsExpanded] = useState(false);

    const [particles, setParticles] = useState<{ width: number; height: number; left: string; top: string; animation: string; animationDelay: string }[]>([]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setParticles(Array.from({ length: 20 }).map(() => ({
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${10 + Math.random() * 20}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
        })));
    }, []);

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden relative">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((style, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-blue-500/10"
                        style={style}
                    />
                ))}
            </div>

            {/* Main content card */}
            <div
                className={`relative z-10 flex flex-col items-center transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
            >
                {/* Glowing ring behind avatar */}
                <div
                    className={`absolute top-0 w-60 h-60 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-xl transition-all duration-1000 delay-300 ${isVisible ? 'opacity-50 scale-100' : 'opacity-0 scale-50'
                        }`}
                    style={{ animation: 'pulse 3s ease-in-out infinite' }}
                />

                {/* Profile Picture with expanding animation */}
                <div
                    className={`relative mb-6 transition-all duration-700 ease-out delay-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                        }`}
                >
                    <div
                        className="w-56 h-56 rounded-full p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 cursor-pointer hover:scale-105 transition-transform duration-300 relative group"
                        onClick={() => setIsExpanded(true)}
                    >
                        <div className="w-full h-full rounded-full bg-slate-900 p-1 overflow-hidden relative">
                            {developerInfo.imageUrl ? (
                                <img
                                    src={developerInfo.imageUrl}
                                    alt={developerInfo.name}
                                    onLoad={() => setImageLoaded(true)}
                                    className={`w-full h-full rounded-full object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100 scale-[1.35]' : 'opacity-0 scale-90'}`}
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-white">{developerInfo.initials}</span>
                                </div>
                            )}

                            {/* Hover Overlay with Expand Icon */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-full backdrop-blur-[2px]">
                                <Maximize2 className="text-white drop-shadow-md animate-pulse" size={32} />
                            </div>
                        </div>
                    </div>

                    {/* Decorative sparkle */}
                    <div className="absolute -top-2 -right-2 text-yellow-400 animate-bounce pointer-events-none">
                        <Sparkles size={24} />
                    </div>
                </div>

                {/* Name with typewriter-like reveal */}
                <h1
                    className={`text-4xl font-bold text-white mb-2 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    {developerInfo.name}
                </h1>

                {/* Title/Role with gradient */}
                <div
                    className={`mb-6 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    <span className="text-xl font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {developerInfo.title}
                    </span>
                </div>

                {/* Bio card */}
                <div
                    className={`max-w-md mx-4 mb-8 p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    <p className="text-slate-300 text-center leading-relaxed">
                        {developerInfo.bio}
                    </p>
                </div>

                {/* Contact Links */}
                <div
                    className={`flex gap-4 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    {/* Teams Link */}
                    <a
                        href={developerInfo.teamsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105"
                    >
                        <MessageSquare size={20} />
                        <span>Teams</span>
                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>

                    {/* Email Link */}
                    <a
                        href={`mailto:${developerInfo.email}`}
                        className="group flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white font-medium hover:bg-white/20 transition-all duration-300 hover:scale-105"
                    >
                        <Mail size={20} />
                        <span>Email</span>
                    </a>
                </div>

                {/* Footer note */}
                <p
                    className={`mt-12 text-sm text-slate-500 transition-all duration-700 delay-1000 ${isVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    Built with ❤️ using React + TypeScript
                </p>
            </div>

            {/* Floating Game Button */}
            {onStartGame && (
                <button
                    onClick={onStartGame}
                    className="absolute bottom-8 right-8 z-20 p-4 bg-green-500 hover:bg-green-400 text-white rounded-full shadow-lg hover:shadow-green-500/50 transition-all duration-300 hover:scale-110 group animate-pulse"
                    title="Play Game"
                >
                    <Gamepad2 size={24} className="group-hover:rotate-12 transition-transform" />
                </button>
            )}

            {/* Image Expansion Modal */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in cursor-zoom-out p-4"
                    onClick={() => setIsExpanded(false)}
                >
                    <div
                        className="bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-w-4xl w-full flex flex-col md:flex-row border border-slate-700/50 backdrop-blur-xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button Mobile */}
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="absolute top-4 right-4 md:hidden z-10 p-2 bg-black/50 rounded-full text-white/70 hover:text-white"
                        >
                            <ExternalLink size={20} className="rotate-180" />
                            {/* Using ExternalLink rotated as a makeshift 'close' or 'minimize' icon since X isn't imported, or I can import X */}
                        </button>

                        {/* Left: Image */}
                        <div className="w-full md:w-1/2 h-72 md:h-auto min-h-[400px] relative group">
                            <img
                                src={developerInfo.imageUrl}
                                alt={developerInfo.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-slate-900/80" />
                        </div>

                        {/* Right: Details */}
                        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center text-left bg-slate-900/50">
                            <h2
                                className="text-3xl md:text-4xl font-bold text-white mb-2"
                                style={{ animation: 'slide-up 0.5s ease-out forwards', opacity: 0, animationDelay: '0.1s' }}
                            >
                                {developerInfo.name}
                            </h2>
                            <p
                                className="text-xl font-medium text-blue-400 mb-6"
                                style={{ animation: 'slide-up 0.5s ease-out forwards', opacity: 0, animationDelay: '0.2s' }}
                            >
                                {developerInfo.title}
                            </p>

                            <div
                                className="space-y-4 mb-8 text-slate-300 leading-relaxed"
                                style={{ animation: 'slide-up 0.5s ease-out forwards', opacity: 0, animationDelay: '0.3s' }}
                            >
                                <p>{developerInfo.bio}</p>
                                <p className="text-sm text-slate-500">
                                    <span className="text-slate-400 font-medium">Core Stack:</span> React, TypeScript, Java, Python
                                </p>
                            </div>

                            <div
                                className="flex gap-4 pt-4 border-t border-white/10"
                                style={{ animation: 'slide-up 0.5s ease-out forwards', opacity: 0, animationDelay: '0.4s' }}
                            >
                                <a
                                    href={developerInfo.teamsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
                                >
                                    <MessageSquare size={18} />
                                    <span>Chat on Teams</span>
                                </a>
                                <a
                                    href={`mailto:${developerInfo.email}`}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 transition-all hover:border-white/20 active:scale-95"
                                >
                                    <Mail size={18} />
                                    <span>Send Email</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Keyframes */}
            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .animate-fade-in {
            animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
            animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scale-in {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
