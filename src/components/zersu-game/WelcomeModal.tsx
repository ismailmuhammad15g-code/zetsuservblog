import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Swords, Gift, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import idleImage from '../../images/idle.png';

// Feature item component with animation
const FeatureItem = ({
    icon: Icon,
    text,
    delay
}: {
    icon: React.ElementType;
    text: string;
    delay: number;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="flex items-center justify-end gap-3 bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors"
        >
            <span className="text-gray-300 text-sm font-medium">{text}</span>
            <div className="p-2 bg-gradient-to-br from-gray-800 to-black rounded-md text-purple-400">
                <Icon size={16} />
            </div>
        </motion.div>
    );
};

const WelcomeModal = () => {
    const [isOpen, setIsOpen] = useState(true);
    const navigate = useNavigate();

    const handleRegister = () => {
        window.location.href = '/register?type=horror&redirectTo=/zetsuchallenge';
    };

    const handleLogin = () => {
        window.location.href = '/auth?type=horror&redirectTo=/zetsuchallenge';
    };

    const handleClose = () => {
        setIsOpen(false);
        navigate('/');
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-[#050505] flex items-center justify-center p-4 overflow-hidden font-['Tajawal'] z-50">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="relative w-full max-w-4xl bg-[#121212]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 max-h-[90vh] overflow-y-auto"
                    >
                        {/* Left Side - Character Image */}
                        <div className="relative w-full md:w-2/5 min-h-[200px] h-48 md:h-auto overflow-hidden bg-gradient-to-b from-purple-900/40 to-black/60 group flex items-center justify-center">
                            <motion.div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent z-10 md:bg-gradient-to-r" />

                            {/* Glow effect behind character */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-32 h-32 md:w-48 md:h-48 bg-purple-500/30 rounded-full blur-3xl" />
                            </div>

                            <motion.img
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.7, delay: 0.2 }}
                                src={idleImage}
                                alt="Zersu"
                                className="relative z-10 w-40 h-40 md:w-full md:h-full object-contain md:object-cover md:object-top transform group-hover:scale-105 transition-transform duration-700 drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                            />

                            {/* Floating Badge */}
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5, type: "spring" }}
                                className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md border border-yellow-500/30 px-3 py-1.5 rounded-full flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-yellow-400 text-xs font-bold tracking-wider uppercase">
                                    Zersu's Arena
                                </span>
                            </motion.div>
                        </div>

                        {/* Right Side - Content */}
                        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center relative">
                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h2 className="text-blue-500 font-bold tracking-widest text-sm uppercase mb-2">
                                    Enter the Arena
                                </h2>
                                <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight leading-none">
                                    ZERSU'S <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                        CHALLENGE
                                    </span>
                                </h1>

                                <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-6" />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-4 mb-8"
                            >
                                <p
                                    className="text-xl text-gray-200 font-medium text-right"
                                    dir="rtl"
                                >
                                    هل أنت جاهز للمواجهة في{" "}
                                    <span className="text-white font-bold">ZetsuservBlog</span>؟
                                </p>
                                <p
                                    className="text-sm text-gray-400 text-right leading-relaxed"
                                    dir="rtl"
                                >
                                    سجّل دخولك الآن واحصل على حزمة البداية المجانية:{" "}
                                    <span className="text-yellow-400 font-bold">5 ZCoins</span>
                                </p>
                            </motion.div>

                            {/* Features Grid */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5, staggerChildren: 0.1 }}
                                className="grid grid-cols-1 gap-3 mb-8"
                            >
                                <FeatureItem
                                    icon={Shield}
                                    text="حماية كاملة للحساب"
                                    delay={0.5}
                                />
                                <FeatureItem
                                    icon={Swords}
                                    text="نظام قتال متقدم (PvP)"
                                    delay={0.6}
                                />
                                <FeatureItem icon={Gift} text="جوائز يومية قيمة" delay={0.7} />
                            </motion.div>

                            {/* Actions */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="flex flex-col gap-3"
                            >
                                <button
                                    onClick={handleRegister}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-purple-900/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
                                >
                                    <span
                                        className="group-hover:translate-x-1 transition-transform"
                                        dir="rtl"
                                    >
                                        نعم، ابدأ التحدي!
                                    </span>
                                    <div className="w-1 h-4 bg-white/20 rounded-full" />
                                </button>

                                <button
                                    onClick={handleLogin}
                                    className="w-full bg-white/5 hover:bg-white/10 text-purple-400 hover:text-purple-300 font-medium py-3 px-6 rounded-xl transition-colors text-sm border border-purple-500/20 hover:border-purple-500/40"
                                    dir="rtl"
                                >
                                    لديّ حساب - تسجيل الدخول
                                </button>

                                <button
                                    onClick={handleClose}
                                    className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-colors text-sm"
                                    dir="rtl"
                                >
                                    لا، ليس الآن
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WelcomeModal;
