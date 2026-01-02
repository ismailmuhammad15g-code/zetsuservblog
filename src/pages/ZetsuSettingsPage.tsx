import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSound } from '@/contexts/SoundContext';
import { Volume2, VolumeX, MessageSquare, Skull, ArrowRight, CloudRain, Sun, CloudFog, Clock } from 'lucide-react';
import { Slider } from '@/components/ui/slider'; // Assuming this exists or I'll use standard input
import { Switch } from '@/components/ui/switch'; // Assuming this exists or I'll use standard input

const ZetsuSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        masterVolume,
        setMasterVolume,
        isMuted,
        toggleMute,
        zersuPersonality,
        setZersuPersonality,
        weatherMode,
        setWeatherMode
    } = useSound();

    return (
        <div className="min-h-screen bg-[#050508] text-white p-6 relative overflow-hidden font-['Tajawal']">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-slate-900/40 z-0" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header */}
                <div className="flex items-center gap-4 border-b border-purple-500/30 pb-6">
                    <button
                        onClick={() => navigate('/zetsuchallenge')}
                        className="p-3 bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <ArrowRight className="w-6 h-6 text-purple-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                            إعدادات الكابوس
                        </h1>
                        <p className="text-slate-400 text-sm">تحكم في عالم Zersu</p>
                    </div>
                </div>

                {/* Audio Settings */}
                <section className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-purple-300">
                        <Volume2 className="w-6 h-6" />
                        الصوت والأجواء
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-lg">كتم الصوت بالكامل</label>
                            <button
                                onClick={toggleMute}
                                className={`w-14 h-8 rounded-full transition-colors relative ${isMuted ? 'bg-red-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${isMuted ? 'left-1' : 'left-7'}`} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-400">
                                <span>مستوى الصوت العام</span>
                                <span>{Math.round(masterVolume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={masterVolume}
                                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                    </div>
                </section>

                {/* Weather Settings */}
                <section className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-300">
                        <CloudRain className="w-6 h-6" />
                        الطقس والأجواء
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setWeatherMode('auto')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${weatherMode === 'auto'
                                ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                                : 'bg-slate-800/50 border-white/5 hover:bg-slate-800 text-slate-400'}`}
                        >
                            <Clock className="w-6 h-6" />
                            <span className="font-bold">تلقائي (حسب الوقت)</span>
                        </button>

                        <button
                            onClick={() => setWeatherMode('sunny')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${weatherMode === 'sunny'
                                ? 'bg-yellow-600/20 border-yellow-500 text-yellow-200'
                                : 'bg-slate-800/50 border-white/5 hover:bg-slate-800 text-slate-400'}`}
                        >
                            <Sun className="w-6 h-6" />
                            <span className="font-bold">مشمس ☀️</span>
                        </button>

                        <button
                            onClick={() => setWeatherMode('rain')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${weatherMode === 'rain'
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                                : 'bg-slate-800/50 border-white/5 hover:bg-slate-800 text-slate-400'}`}
                        >
                            <CloudRain className="w-6 h-6" />
                            <span className="font-bold">ممطر ⛈️</span>
                        </button>

                        <button
                            onClick={() => setWeatherMode('fog')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${weatherMode === 'fog'
                                ? 'bg-gray-600/20 border-gray-400 text-gray-200'
                                : 'bg-slate-800/50 border-white/5 hover:bg-slate-800 text-slate-400'}`}
                        >
                            <CloudFog className="w-6 h-6" />
                            <span className="font-bold">ضباب 🌫️</span>
                        </button>
                    </div>
                </section>

                {/* Personality Settings */}
                <section className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px]" />

                    <h2 className="text-xl font-bold flex items-center gap-2 text-pink-300">
                        <Skull className="w-6 h-6" />
                        شخصية Zersu
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold">وضع السخرية والإهانات</h3>
                                <p className="text-xs text-slate-400 max-w-[250px]">
                                    عند تفعيل هذا الخيار، سيقوم Zersu بالسخرية منك عند الفشل.
                                </p>
                            </div>
                            <button
                                onClick={() => setZersuPersonality(zersuPersonality === 'sarcastic' ? 'polite' : 'sarcastic')}
                                className={`w-14 h-8 rounded-full transition-colors relative ${zersuPersonality === 'sarcastic' ? 'bg-purple-600' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${zersuPersonality === 'sarcastic' ? 'left-1' : 'left-7'}`} />
                            </button>
                        </div>

                        {/* Preview */}
                        <div className="bg-black/40 rounded-xl p-4 border border-purple-500/20 flex gap-4 items-center">
                            <img
                                src="https://i.ibb.co/rGMR1Q98/zersu-villhaha.png"
                                alt="Zersu"
                                className={`w-16 h-16 rounded-full border-2 ${zersuPersonality === 'sarcastic' ? 'border-red-500' : 'border-blue-500'}`}
                            />
                            <div>
                                <p className="text-xs text-slate-500 mb-1">معاينة الرد:</p>
                                <p className={`italic text-sm ${zersuPersonality === 'sarcastic' ? 'text-red-400' : 'text-blue-300'}`}>
                                    {zersuPersonality === 'sarcastic'
                                        ? '"هل تسمي هذا لعباً؟ جدتي تلعب أفضل منك! 😂"'
                                        : '"لا بأس، حاول مرة أخرى ستنجح بالتأكيد! 😊"'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default ZetsuSettingsPage;
