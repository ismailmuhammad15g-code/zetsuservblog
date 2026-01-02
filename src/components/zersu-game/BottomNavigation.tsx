import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Gamepad2, User, Trophy, ShoppingBag, Timer, Swords } from 'lucide-react';

interface Tab {
    id: string;
    icon: React.ReactNode;
    label: string;
    labelAr: string;
    path: string;
}

interface BottomNavigationProps {
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs: Tab[] = [
        { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home', labelAr: 'الرئيسية', path: '/zetsuchallenge' },
        { id: 'challenges', icon: <Gamepad2 className="w-5 h-5" />, label: 'Challenges', labelAr: 'التحديات', path: '/zetsuchallenge/challenges' },
        { id: 'tasks', icon: <Timer className="w-5 h-5" />, label: 'Tasks', labelAr: 'المهام', path: '/zetsuchallenge/active-tasks' },
        { id: 'leaderboard', icon: <Trophy className="w-5 h-5" />, label: 'Leaders', labelAr: 'المتصدرون', path: '/leaderboard' },
        { id: 'multiplayer', icon: <Swords className="w-5 h-5" />, label: 'Multiplayer', labelAr: 'أصدقاء', path: '/multiplayer' },
        { id: 'profile', icon: <User className="w-5 h-5" />, label: 'Profile', labelAr: 'الملف', path: '/settings' },
    ];

    const currentTab = activeTab || tabs.find(t => t.path === location.pathname)?.id || 'challenges';

    const handleTabClick = (tab: Tab) => {
        if (onTabChange) {
            onTabChange(tab.id);
        }
        navigate(tab.path);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-purple-500/30 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-300">
            <div className="flex justify-between items-center w-full max-w-3xl mx-auto px-2 md:px-6">
                {tabs.map(tab => {
                    const isActive = currentTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab)}
                            className={`flex flex-col items-center justify-center py-2 px-1 flex-1 transition-all duration-200 min-w-0 group relative ${isActive
                                ? 'text-purple-400'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${isActive
                                ? 'bg-purple-500/20 shadow-lg shadow-purple-500/20 -translate-y-1'
                                : 'group-hover:-translate-y-0.5'
                                }`}>
                                {tab.icon}
                            </div>
                            <span className={`text-[10px] sm:text-xs mt-1 font-medium truncate w-full text-center ${isActive ? 'text-purple-400' : ''
                                }`}>
                                {tab.labelAr}
                            </span>
                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                            )}
                        </button>
                    );
                })}
            </div>
            {/* Safe area for iOS */}
            <div className="h-[env(safe-area-inset-bottom)]"></div>
        </nav>
    );
};

export default BottomNavigation;
