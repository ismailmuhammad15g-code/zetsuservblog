import React, { useState, useEffect } from 'react';
import { Globe, Wifi, Users, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Server {
    id: string;
    name: string;
    region: string;
    region_ar: string | null;
    location_x: number;
    location_y: number;
    ping: number;
    player_count: number;
    status: string;
}

interface WorldMapProps {
    onServerSelect: (serverId: string) => void;
    isConnecting: boolean;
}

const fallbackServers: Server[] = [
    { id: 'ASIA', name: 'Tokyo', region: 'Asia', region_ar: 'آسيا', location_x: 82, location_y: 35, ping: 45, player_count: 0, status: 'online' },
    { id: 'EUROPE', name: 'Frankfurt', region: 'Europe', region_ar: 'أوروبا', location_x: 48, location_y: 28, ping: 35, player_count: 0, status: 'online' },
    { id: 'AMERICA', name: 'New York', region: 'America', region_ar: 'أمريكا', location_x: 22, location_y: 32, ping: 85, player_count: 0, status: 'online' },
    { id: 'BRAZIL', name: 'São Paulo', region: 'Brazil', region_ar: 'البرازيل', location_x: 28, location_y: 65, ping: 120, player_count: 0, status: 'online' },
    { id: 'AUSTRALIA', name: 'Sydney', region: 'Australia', region_ar: 'أستراليا', location_x: 88, location_y: 72, ping: 180, player_count: 0, status: 'busy' },
    { id: 'MIDDLE_EAST', name: 'Dubai', region: 'Middle East', region_ar: 'الشرق الأوسط', location_x: 58, location_y: 38, ping: 25, player_count: 0, status: 'online' },
];

const WorldMap: React.FC<WorldMapProps> = ({ onServerSelect, isConnecting }) => {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredServer, setHoveredServer] = useState<string | null>(null);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);

    useEffect(() => {
        const fetchServers = async () => {
            try {
                const { data, error } = await supabase
                    .from('game_servers')
                    .select('*')
                    .order('ping', { ascending: true });

                if (error) {
                    console.error('Error fetching servers:', error);
                    setServers(fallbackServers);
                } else if (data && data.length > 0) {
                    setServers(data);
                } else {
                    setServers(fallbackServers);
                }
            } catch (error) {
                console.error('Server fetch error:', error);
                setServers(fallbackServers);
            } finally {
                setLoading(false);
            }
        };
        fetchServers();
    }, []);

    const handleServerClick = (server: Server) => {
        if (server.status === 'maintenance' || isConnecting) return;
        setSelectedServer(server.id);
    };

    const handleConnect = () => {
        if (selectedServer) {
            onServerSelect(selectedServer);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'busy': return 'bg-yellow-500';
            case 'maintenance': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getPingColor = (ping: number) => {
        if (ping < 50) return 'text-green-400';
        if (ping < 100) return 'text-yellow-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-4xl mx-auto">
            {/* Title */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
                    <Globe className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: '8s' }} />
                    <span className="text-purple-300 font-bold">اختر ميدان المعركة</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                    GLOBAL SERVER NETWORK
                </h2>
            </div>

            {/* Map Container */}
            <div className="relative aspect-[2/1] rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 overflow-hidden shadow-2xl shadow-cyan-500/10">
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `
                        linear-gradient(rgba(56, 189, 248, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(56, 189, 248, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                }}></div>

                {/* Server nodes */}
                {servers.map((server) => (
                    <div
                        key={server.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${server.status === 'maintenance' ? 'opacity-50 cursor-not-allowed' : ''
                            } ${selectedServer === server.id ? 'scale-125 z-20' : 'z-10 hover:scale-110'}`}
                        style={{ left: `${server.location_x}%`, top: `${server.location_y}%` }}
                        onClick={() => handleServerClick(server)}
                        onMouseEnter={() => setHoveredServer(server.id)}
                        onMouseLeave={() => setHoveredServer(null)}
                    >
                        {/* Ping animation */}
                        <div className={`absolute inset-0 rounded-full ${getStatusColor(server.status)} animate-ping opacity-40`}
                            style={{ animationDuration: '2s' }}></div>

                        {/* Node */}
                        <div className={`relative w-6 h-6 rounded-full ${getStatusColor(server.status)} border-2 ${selectedServer === server.id ? 'border-white shadow-lg shadow-purple-500' : 'border-white/50'
                            } flex items-center justify-center`}>
                            {selectedServer === server.id && (
                                <CheckCircle className="w-4 h-4 text-white" />
                            )}
                        </div>

                        {/* Label */}
                        <div className={`absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold ${selectedServer === server.id ? 'text-white' : 'text-gray-400'
                            }`}>
                            {server.name}
                        </div>

                        {/* Tooltip */}
                        {hoveredServer === server.id && (
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-800/95 border border-cyan-500/30 rounded-lg p-3 min-w-[150px] shadow-xl z-30 backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="text-base font-bold text-white mb-1">{server.region_ar || server.region}</div>
                                    <div className="text-xs text-gray-400 mb-2">{server.name}</div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <Wifi className="w-3 h-3" /> Ping:
                                        </span>
                                        <span className={getPingColor(server.ping)}>{server.ping}ms</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <Users className="w-3 h-3" /> اللاعبون:
                                        </span>
                                        <span className="text-cyan-400">{server.player_count}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-400">متاح</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-gray-400">مشغول</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-gray-400">صيانة</span>
                    </div>
                </div>
            </div>

            {/* Connect Button */}
            {selectedServer && (
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/50 to-cyan-900/50 rounded-xl border border-purple-500/30 animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                <Globe className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="text-white font-bold text-lg">
                                    {servers.find(s => s.id === selectedServer)?.region_ar || servers.find(s => s.id === selectedServer)?.region}
                                </div>
                                <div className="text-gray-400 text-sm">
                                    {servers.find(s => s.id === selectedServer)?.name}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="relative px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl overflow-hidden group transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isConnecting ? (
                                <span className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 animate-spin" />
                                    جاري الاتصال...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Wifi className="w-5 h-5" />
                                    اتصل الآن
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorldMap;
