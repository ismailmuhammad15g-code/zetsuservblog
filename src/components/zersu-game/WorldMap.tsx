import React, { useState, useEffect } from 'react';
import { Globe, Wifi, Users, Clock, CheckCircle, Loader2, Zap, Shield, Crosshair } from 'lucide-react';
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
    { id: 'ASIA', name: 'Tokyo', region: 'Asia', region_ar: 'آسيا', location_x: 82, location_y: 35, ping: 45, player_count: 1240, status: 'online' },
    { id: 'EUROPE', name: 'Frankfurt', region: 'Europe', region_ar: 'أوروبا', location_x: 48, location_y: 28, ping: 35, player_count: 3521, status: 'online' },
    { id: 'AMERICA', name: 'New York', region: 'America', region_ar: 'أمريكا', location_x: 22, location_y: 32, ping: 85, player_count: 2100, status: 'online' },
    { id: 'BRAZIL', name: 'São Paulo', region: 'Brazil', region_ar: 'البرازيل', location_x: 28, location_y: 65, ping: 120, player_count: 850, status: 'online' },
    { id: 'AUSTRALIA', name: 'Sydney', region: 'Australia', region_ar: 'أستراليا', location_x: 88, location_y: 72, ping: 180, player_count: 420, status: 'busy' },
    { id: 'MIDDLE_EAST', name: 'Dubai', region: 'Middle East', region_ar: 'الشرق الأوسط', location_x: 58, location_y: 38, ping: 25, player_count: 5200, status: 'online' },
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
            case 'online': return 'from-green-400 to-emerald-600 shadow-green-500/50';
            case 'busy': return 'from-yellow-400 to-orange-600 shadow-orange-500/50';
            case 'maintenance': return 'from-red-400 to-red-600 shadow-red-500/50';
            default: return 'from-gray-400 to-gray-600';
        }
    };

    const getPingColor = (ping: number) => {
        if (ping < 50) return 'text-green-400';
        if (ping < 100) return 'text-yellow-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin relative z-10" />
                </div>
                <p className="text-cyan-400 font-mono tracking-widest text-sm animate-pulse">INITIALIZING UPLINK...</p>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-5xl mx-auto p-4">

            {/* Holographic Header */}
            <div className="text-center mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent"></div>
                <div className="inline-block relative z-10 bg-[#0a0f1c] px-6">
                    <div className="flex items-center gap-3 mb-2 justify-center">
                        <Globe className="w-6 h-6 text-cyan-400 animate-[spin_10s_linear_infinite]" />
                        <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                            GLOBAL_NETWORK
                        </h2>
                    </div>
                    <p className="text-cyan-500/60 font-mono text-xs tracking-[0.3em] uppercase">Select Deployment Node</p>
                </div>
            </div>

            {/* Main Map Interface */}
            <div className="relative aspect-[16/9] md:aspect-[2/1] rounded-3xl border border-cyan-500/20 bg-[#050914] overflow-hidden group shadow-[0_0_50px_rgba(6,182,212,0.1)]">

                {/* Background Grid & Effects */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `linear-gradient(rgba(6,182,212,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.2) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    perspective: '1000px',
                    transform: 'perspective(1000px) rotateX(10deg) scale(1.1)'
                }}></div>

                {/* Scanning Line Animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-[20%] w-full animate-[scan_4s_linear_infinite] pointer-events-none"></div>

                {/* World Map Silhouette (SVG or just implied by nodes) */}
                <div className="absolute inset-0 opacity-30 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-cover bg-center bg-no-repeat hue-rotate-180 invert mix-blend-overlay"></div>

                {/* Server Nodes */}
                {servers.map((server) => {
                    const isSelected = selectedServer === server.id;
                    const isHovered = hoveredServer === server.id;

                    return (
                        <div
                            key={server.id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-500
                                ${server.status === 'maintenance' ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                                ${isSelected ? 'z-30 scale-110' : 'z-20 hover:scale-110'}
                            `}
                            style={{ left: `${server.location_x}%`, top: `${server.location_y}%` }}
                            onClick={() => handleServerClick(server)}
                            onMouseEnter={() => setHoveredServer(server.id)}
                            onMouseLeave={() => setHoveredServer(null)}
                        >
                            {/* Pulse Effect */}
                            <div className={`absolute inset-0 -m-4 rounded-full bg-gradient-to-r ${getStatusColor(server.status)} opacity-20 animate-ping`}></div>

                            {/* Core Node */}
                            <div className={`relative w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-br ${getStatusColor(server.status)} border border-white/50 shadow-[0_0_15px_currentColor] flex items-center justify-center transition-all duration-300
                                ${isSelected ? 'ring-4 ring-white/20 shadow-[0_0_30px_currentColor]' : ''}
                            `}>
                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>}
                            </div>

                            {/* Connecting Lines (Decor) */}
                            {isSelected && (
                                <div className="absolute top-1/2 left-1/2 w-[200px] h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent origin-left rotate-45 pointer-events-none animate-[grow_0.5s_ease-out]"></div>
                            )}

                            {/* Label */}
                            <div className={`absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100'}`}>
                                <div className="bg-[#0f172a]/90 backdrop-blur-md px-3 py-1 rounded-sm border-l-2 border-cyan-500 text-cyan-100 text-[10px] font-bold tracking-wider uppercase shadow-xl">
                                    {server.name}
                                </div>
                            </div>

                            {/* Info Card (Hover/Select) */}
                            {(isHovered || isSelected) && (
                                <div className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-[#0a0f1c]/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-300 animate-in zoom-in-95 origin-bottom z-40`}>
                                    <div className="h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                                    <div className="p-3 space-y-2">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                            <span className="font-bold text-white text-sm">{server.region_ar || server.region}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${server.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {server.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-slate-900/50 p-1.5 rounded border border-white/5">
                                                <div className="text-gray-500 mb-0.5">PING</div>
                                                <div className={`font-mono font-bold ${getPingColor(server.ping)}`}>{server.ping}ms</div>
                                            </div>
                                            <div className="bg-slate-900/50 p-1.5 rounded border border-white/5">
                                                <div className="text-gray-500 mb-0.5">PLAYERS</div>
                                                <div className="font-mono font-bold text-cyan-400">{server.player_count}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Footer Status Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md border-t border-white/5 p-2 px-4 flex justify-between items-center text-[10px] font-mono text-cyan-500/60 uppercase">
                    <div>System Status: <span className="text-green-400">OPTIMAL</span></div>
                    <div className="flex gap-4">
                        <span>Total Nodes: {servers.length}</span>
                        <span>Active Agents: {servers.reduce((a, b) => a + b.player_count, 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Connection Control Panel */}
            {selectedServer && (
                <div className="mt-8 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="bg-gradient-to-r from-slate-900 to-[#101525] p-1 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.1)] border border-cyan-500/20">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-xl bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">

                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                                    <div className="w-16 h-16 rounded-xl bg-slate-950 border border-cyan-500/50 flex items-center justify-center relative overlow-hidden">
                                        <Globe className="w-8 h-8 text-cyan-400" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-cyan-200 text-xs font-mono uppercase tracking-widest mb-1">Target Selected</div>
                                    <div className="text-2xl font-black text-white tracking-tight">
                                        {servers.find(s => s.id === selectedServer)?.region_ar}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-cyan-400/80">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Ready to Link
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className="relative w-full md:w-auto min-w-[240px] group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-300 group-hover:scale-110"></div>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay transition-opacity"></div>

                                <div className="relative px-8 py-4 flex items-center justify-center gap-3">
                                    {isConnecting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                            <span className="font-black text-white tracking-widest uppercase">Initializing Link...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300 group-hover:animate-bounce" />
                                            <span className="font-black text-white tracking-widest uppercase text-lg">INITIATE TRAVERSE</span>
                                        </>
                                    )}
                                </div>
                                {/* Tech borders */}
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50"></div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50"></div>
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorldMap;
