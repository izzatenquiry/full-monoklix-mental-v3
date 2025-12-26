
import React, { useState, useEffect } from 'react';
import { getContent } from '../../services/contentService';
import { getTotalPlatformUsage } from '../../services/userService';
import { type TutorialContent, type User, type Language, type View } from '../../types';
import { ImageIcon, VideoIcon, TrendingUpIcon, WandIcon, FileTextIcon, ChevronRightIcon } from '../Icons';

interface DashboardViewProps {
    currentUser: User;
    language: Language;
    navigateTo: (view: View) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, navigateTo }) => {
  const [content, setContent] = useState<TutorialContent | null>(null);
  const [platformStats, setPlatformStats] = useState<{ totalImages: number; totalVideos: number } | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
        const contentData = await getContent();
        setContent(contentData);
        const stats = await getTotalPlatformUsage();
        setPlatformStats(stats);
    };
    fetchPageData();
  }, []);

  const QuickActionCard = ({ title, desc, icon: Icon, color, onClick, delay }: any) => (
      <button 
        onClick={onClick}
        className={`holo-card p-6 flex flex-col items-start justify-between h-40 group hover:border-${color}-500/50 transition-all duration-500 animate-zoomIn`}
        style={{ animationDelay: `${delay}ms` }}
      >
          {/* Ambient Glow */}
          <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full bg-${color}-500 opacity-20 blur-[50px] group-hover:opacity-40 transition-opacity duration-500`}></div>
          
          <div className={`relative z-10 p-3 rounded-2xl bg-white/5 border border-white/10 text-${color}-400 group-hover:text-white group-hover:bg-${color}-500 group-hover:border-${color}-400 transition-all duration-300`}>
              <Icon className="w-6 h-6" />
          </div>
          
          <div className="relative z-10 text-left w-full">
              <div className="flex justify-between items-center w-full">
                  <h3 className="font-bold text-lg text-white group-hover:text-glow transition-all">{title}</h3>
                  <ChevronRightIcon className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-neutral-400 mt-1 font-medium">{desc}</p>
          </div>
      </button>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      
      {/* Header Section with Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-4 animate-zoomIn">
        {/* Hello Message */}
        <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-8 bg-brand-start"></div>
                <span className="text-xs font-mono text-brand-start tracking-widest uppercase">System Online</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none">
                HELLO, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-start to-brand-end">{currentUser.fullName?.split(' ')[0] || currentUser.username}</span>
            </h1>
            <p className="text-neutral-400 mt-2 text-lg font-light">Welcome to the future of content creation.</p>
        </div>

        {/* Stats Module (Moved to Header) */}
        <div className="lg:col-span-4">
             <div className="holo-card p-6 relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                     <TrendingUpIcon className="w-24 h-24 text-white" />
                 </div>
                 <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Global Neural Activity</h3>
                 
                 <div className="grid grid-cols-2 gap-4 relative z-10">
                     <div>
                         <div className="flex items-baseline gap-1 mb-1">
                             <p className="text-2xl font-black text-white">{platformStats?.totalImages.toLocaleString() || '0'}</p>
                         </div>
                         <span className="text-[10px] font-bold text-green-400 flex items-center gap-1 uppercase tracking-wide">
                             <ImageIcon className="w-3 h-3" /> Images
                         </span>
                         <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                             <div className="bg-brand-start h-1 rounded-full w-3/4 shadow-[0_0_10px_#4A6CF7]"></div>
                         </div>
                     </div>
                     
                     <div>
                         <div className="flex items-baseline gap-1 mb-1">
                             <p className="text-2xl font-black text-white">{platformStats?.totalVideos.toLocaleString() || '0'}</p>
                         </div>
                         <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1 uppercase tracking-wide">
                             <VideoIcon className="w-3 h-3" /> Videos
                         </span>
                         <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                             <div className="bg-brand-end h-1 rounded-full w-1/2 shadow-[0_0_10px_#A05BFF]"></div>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      </div>

      {/* Main Content Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Panel: Welcome Video */}
        {content?.mainVideoUrl && (
            <div className="w-full animate-zoomIn h-full" style={{ animationDelay: '50ms' }}>
                <div className="nav-capsule p-1 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group h-full">
                    <div className="relative aspect-video w-full bg-black rounded-[1.2rem] overflow-hidden">
                        <iframe 
                            src={content.mainVideoUrl} 
                            title="Get Started"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            </div>
        )}

        {/* Right Panel: Action Modules (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 w-full">
            <QuickActionCard 
                title="Image Gen" 
                desc="Flux / Imagen Engine" 
                icon={ImageIcon} 
                color="purple" 
                onClick={() => navigateTo('ai-image-suite')}
                delay={100}
            />
            <QuickActionCard 
                title="Video Gen" 
                desc="Veo Cinematic" 
                icon={VideoIcon} 
                color="blue" 
                onClick={() => navigateTo('ai-video-suite')}
                delay={200}
            />
            <QuickActionCard 
                title="Copywriter" 
                desc="Neuro-Language" 
                icon={FileTextIcon} 
                color="green" 
                onClick={() => navigateTo('ai-text-suite')}
                delay={300}
            />
            <QuickActionCard 
                title="Enhancer" 
                desc="Upscale Logic" 
                icon={WandIcon} 
                color="pink" 
                onClick={() => navigateTo('ai-image-suite')}
                delay={400}
            />
        </div>

      </div>
    </div>
  );
};

export default DashboardView;
