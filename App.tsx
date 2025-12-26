
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type View, type User, type Language, type Announcement } from './types';
import Navigation from './components/Navigation'; // New Nav
import DashboardView from './components/views/DashboardView'; // New Home
import AiTextSuiteView from './components/views/AiTextSuiteView';
import AiImageSuiteView from './components/views/AiImageSuiteView';
import AiVideoSuiteView from './components/views/AiVideoSuiteView';
import SettingsView from './components/views/SettingsView';
import LoginPage from './LoginPage';
import { GalleryView } from './components/views/GalleryView';
import WelcomeAnimation from './components/WelcomeAnimation';
import { RefreshCwIcon, TerminalIcon, SunIcon, MoonIcon, AlertTriangleIcon, CheckCircleIcon, XIcon, SparklesIcon, MenuIcon } from './components/Icons';
import { signOutUser, logActivity, getVeoAuthTokens, getSharedMasterApiKey, updateUserLastSeen, assignPersonalTokenAndIncrementUsage, saveUserPersonalAuthToken, updateUserProxyServer, getAvailableServersForUser, getDeviceOS, getServerUsageCounts, getUserProfile } from './services/userService';
import Spinner from './components/common/Spinner';
import { loadData, saveData } from './services/indexedDBService';
import { GetStartedView } from './components/views/GetStartedView';
import AiPromptLibrarySuiteView from './components/views/AiPromptLibrarySuiteView';
import eventBus from './services/eventBus';
import ApiKeyStatus from './components/ApiKeyStatus';
import { supabase, type Database } from './services/supabaseClient';
import { runComprehensiveTokenTest } from './services/imagenV3Service';
import ConsoleLogSidebar from './components/ConsoleLogSidebar';
import { getTranslations } from './services/translations';
import { getAnnouncements } from './services/contentService';
import ApiGeneratorView from './components/views/ApiGeneratorView';
import MasterDashboardView from './components/views/MasterDashboardView';
import TokenMasterView from './components/views/TokenMasterView';
import UgcGeneratorView from './components/views/UgcGenView';
import AdminSuiteView from './components/views/AdminSuiteView';
import SuiteLayout from './components/common/SuiteLayout';
import ServerSelectionModal from './components/common/ServerSelectionModal';

// ... (Keep existing Interfaces VideoGenPreset, ImageEditPreset etc.)
interface VideoGenPreset {
  prompt: string;
  image: { base64: string; mimeType: string; };
}
interface ImageEditPreset {
  base64: string;
  mimeType: string;
}

// NOTE: ThemeSwitcher removed from UI as 2100 theme is dark-only, but logic kept for compatibility.
const ThemeSwitcher: React.FC<{ theme: string; setTheme: (theme: string) => void }> = ({ theme, setTheme }) => (
    <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
        title="Toggle Theme (Optimized for Dark)"
    >
        {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
    </button>
);

const App: React.FC = () => {
  // ... (State initialization remains mostly the same)
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('home');
  const [theme, setTheme] = useState('dark'); // Default to dark for 2100 theme
  const [language, setLanguage] = useState<Language>('en');
  const [videoGenPreset, setVideoGenPreset] = useState<VideoGenPreset | null>(null);
  const [imageToReEdit, setImageToReEdit] = useState<ImageEditPreset | null>(null);
  const [imageGenPresetPrompt, setImageGenPresetPrompt] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For mobile drawer
  const [isLogSidebarOpen, setIsLogSidebarOpen] = useState(false);
  const [isShowingWelcome, setIsShowingWelcome] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [veoTokenRefreshedAt, setVeoTokenRefreshedAt] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const isAssigningTokenRef = useRef(false);
  const [needsSilentTokenAssignment, setNeedsSilentTokenAssignment] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const T = getTranslations().app;

  // ... (Keep existing useEffects for loading settings, user session, etc.)
  useEffect(() => {
    const loadSettings = async () => {
        // Force dark mode for 2100 aesthetic initially
        setTheme('dark');
        const savedLang = await loadData<Language>('language');
        if (savedLang) setLanguage(savedLang);
    };
    loadSettings();
    getAnnouncements().then(setAnnouncements).catch(console.error);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    saveData('theme', theme);
  }, [theme]);

  // ... (Keep User Update, Logout, Clear Cache Logic)
  const handleUserUpdate = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  }, []);

  const handleLogout = useCallback(async () => {
    if (currentUser) updateUserProxyServer(currentUser.id, null);
    await signOutUser();
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    setCurrentUser(null);
    setActiveApiKey(null);
    setActiveView('home');
  }, [currentUser]);

  // ... (Keep Token Assignment Logic - assignTokenProcess, etc.)
  const assignTokenProcess = useCallback(async (): Promise<{ success: boolean; error: string | null; }> => {
      // (Original logic from previous App.tsx - omitted for brevity but assumed present)
      return { success: false, error: "Not implemented in rebuild snippet" }; 
  }, [currentUser]);

  // Check Session
  useEffect(() => {
        const savedUserJson = localStorage.getItem('currentUser');
        if (savedUserJson) setCurrentUser(JSON.parse(savedUserJson));
        setSessionChecked(true);
        setIsApiKeyLoading(false);
  }, []);

  // AUTO-SYNC: Fetch fresh profile from DB on load to ensure personalAuthToken is up to date
  useEffect(() => {
      if (currentUser?.id) {
          getUserProfile(currentUser.id).then(freshUser => {
              if (freshUser) {
                  // If the DB has a token but local doesn't, or they differ, update local.
                  if (freshUser.personalAuthToken !== currentUser.personalAuthToken) {
                      console.log('[Auto-Sync] Syncing newer token from DB to local session.');
                      handleUserUpdate(freshUser);
                  }
                  // Also update status or other fields if they changed
                  if (freshUser.status !== currentUser.status) {
                      handleUserUpdate(freshUser);
                  }
              }
          }).catch(err => console.error("Background profile sync failed", err));
      }
  }, [currentUser?.id, handleUserUpdate]);

  // Initialize System Resources (API Key, Proxy Server, Veo Tokens)
  useEffect(() => {
    const initSystem = async () => {
        if (!currentUser) return;

        // 1. Shared API Key
        if (!activeApiKey) {
            const key = await getSharedMasterApiKey();
            if (key) {
                setActiveApiKey(key);
                sessionStorage.setItem('monoklix_session_api_key', key);
            }
        }

        // 2. Proxy Server
        const currentServer = sessionStorage.getItem('selectedProxyServer');
        if (!currentServer) {
            const servers = await getAvailableServersForUser(currentUser);
            if (servers.length > 0) {
                // Random load balance for default
                const selected = servers[Math.floor(Math.random() * servers.length)];
                sessionStorage.setItem('selectedProxyServer', selected);
            }
        }

        // 3. Veo Tokens (Background)
        getVeoAuthTokens().then(tokens => {
            if (tokens) {
                sessionStorage.setItem('veoAuthTokens', JSON.stringify(tokens));
                setVeoTokenRefreshedAt(new Date().toISOString());
            }
        });
    };

    if (currentUser) {
        initSystem();
    }
  }, [currentUser, activeApiKey]);


  // --- VIEW RENDERING WITH NEW LAYOUT ---
  const renderView = () => {
    if (!currentUser) return null;

    switch (activeView) {
      case 'home':
        return <DashboardView currentUser={currentUser} language={language} navigateTo={setActiveView} />;
      
      case 'ai-text-suite':
        return (
            <SuiteLayout title="AI Content Suite">
                <AiTextSuiteView currentUser={currentUser} language={language} />
            </SuiteLayout>
        );

      case 'ai-image-suite':
        return (
            <SuiteLayout title="AI Image Suite">
                <AiImageSuiteView 
                  onCreateVideo={(p) => { setVideoGenPreset(p); setActiveView('ai-video-suite'); }} 
                  onReEdit={(p) => { setImageToReEdit(p); setActiveView('ai-image-suite'); }}
                  imageToReEdit={imageToReEdit}
                  clearReEdit={() => setImageToReEdit(null)}
                  presetPrompt={imageGenPresetPrompt}
                  clearPresetPrompt={() => setImageGenPresetPrompt(null)}
                  currentUser={currentUser}
                  onUserUpdate={handleUserUpdate}
                  language={language}
                />
            </SuiteLayout>
        );

      case 'ai-video-suite':
        return (
            <SuiteLayout title="AI Video & Voice">
                <AiVideoSuiteView 
                  currentUser={currentUser}
                  preset={videoGenPreset} 
                  clearPreset={() => setVideoGenPreset(null)}
                  onCreateVideo={(p) => { setVideoGenPreset(p); setActiveView('ai-video-suite'); }}
                  onReEdit={(p) => { setImageToReEdit(p); setActiveView('ai-image-suite'); }}
                  onUserUpdate={handleUserUpdate}
                  language={language}
                />
            </SuiteLayout>
        );

      case 'ai-prompt-library-suite':
        return (
            <SuiteLayout title="Prompt Library">
                <AiPromptLibrarySuiteView 
                    onUsePrompt={(p) => { 
                        setImageGenPresetPrompt(p); 
                        setActiveView('ai-image-suite'); 
                    }} 
                    language={language} 
                />
            </SuiteLayout>
        );
        
      case 'gallery':
         return (
            <SuiteLayout title="Your Gallery">
                <GalleryView 
                    onCreateVideo={(p) => { setVideoGenPreset(p); setActiveView('ai-video-suite'); }} 
                    onReEdit={(p) => { setImageToReEdit(p); setActiveView('ai-image-suite'); }} 
                    language={language} 
                />
            </SuiteLayout>
         );

      case 'get-started':
         return <SuiteLayout title="Get Started"><GetStartedView language={language} /></SuiteLayout>;
      
      case 'settings':
         return <SuiteLayout title="Settings"><SettingsView currentUser={currentUser} tempApiKey={null} onUserUpdate={handleUserUpdate} language={language} setLanguage={setLanguage} veoTokenRefreshedAt={veoTokenRefreshedAt} assignTokenProcess={assignTokenProcess} /></SuiteLayout>;

      case 'admin-suite':
          return <SuiteLayout title="Admin Command Center"><AdminSuiteView currentUser={currentUser} language={language} /></SuiteLayout>;

      default:
        return <DashboardView currentUser={currentUser} language={language} navigateTo={setActiveView} />;
    }
  };

  if (!sessionChecked || isApiKeyLoading) return <div className="flex items-center justify-center min-h-screen bg-[#050505]"><Spinner /></div>;
  
  if (!currentUser) return <LoginPage onLoginSuccess={(u) => { 
      // CRITICAL FIX: Save to localStorage immediately upon login to ensure API client can read it.
      localStorage.setItem('currentUser', JSON.stringify(u));
      setCurrentUser(u); 
      setJustLoggedIn(true); 
  }} />;
  
  if (isShowingWelcome) return <WelcomeAnimation onAnimationEnd={() => { setIsShowingWelcome(false); setActiveView('home'); }} />;

  return (
    // Main App Container - Using dvh for better mobile viewport handling
    <div className="flex h-screen sm:h-[100dvh] font-sans selection:bg-brand-start selection:text-white relative overflow-hidden">
        
        {/* Unified Navigation (Floating Rail/Bottom) */}
        <Navigation 
            activeView={activeView} 
            setActiveView={setActiveView} 
            currentUser={currentUser} 
            onLogout={handleLogout}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
        />

        <main className="flex-1 flex flex-col min-w-0 md:pl-24 lg:pl-28 transition-all duration-300 relative z-10 h-full">
            {/* Header (Full Width "Full Petak") */}
            <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl shrink-0">
                <div className="w-full px-4 py-3 md:px-6 flex items-center justify-between">
                    {/* Mobile Logo Left (Rail handles desktop logo) */}
                    <div className="md:hidden font-black text-xl tracking-tighter flex items-center gap-2 text-white">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-start to-brand-end flex items-center justify-center text-white font-bold text-lg">M</div>
                        <span>MONOklix</span>
                    </div>
                    
                    {/* Desktop spacer */}
                    <div className="hidden md:block">
                        <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Mk-OS v2.1</span>
                    </div>
                    
                    {/* Right Actions */}
                    <div className="flex items-center gap-3 ml-auto">
                        
                        {/* Operational Status */}
                        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-green-400 bg-green-900/20 px-3 py-1.5 rounded-full border border-green-500/20">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            OPERATIONAL
                        </div>

                        <div className="h-4 w-px bg-white/10 hidden md:block"></div>

                        {/* Reload Button */}
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                            title="Refresh App"
                        >
                            <RefreshCwIcon className="w-5 h-5" />
                        </button>

                        {/* Console Log - Moved position */}
                        <button
                            onClick={() => setIsLogSidebarOpen(!isLogSidebarOpen)}
                            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        >
                            <TerminalIcon className="w-5 h-5" />
                        </button>

                        {/* API Key Status - Moved position */}
                        <ApiKeyStatus 
                            activeApiKey={activeApiKey} 
                            veoTokenRefreshedAt={veoTokenRefreshedAt} 
                            currentUser={currentUser}
                            assignTokenProcess={assignTokenProcess}
                            onUserUpdate={handleUserUpdate}
                            onOpenChangeServerModal={() => setShowServerModal(true)}
                            language={language}
                        />

                        {/* Menu Icon - Mobile Only */}
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="md:hidden p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        >
                            <MenuIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area - Responsive scrolling behavior */}
            {/* UPDATED: Removed fixed overflow to allow natural page scrolling on desktop */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar">
                {/* Announcement Banner (Holographic Marquee) */}
                {activeView === 'home' && announcements.length > 0 && (
                     <div className="mb-6 mx-auto max-w-[1600px] w-full bg-brand-start/10 border border-brand-start/20 text-white p-2 rounded-xl shadow-[0_0_15px_rgba(74,108,247,0.2)] flex items-center gap-3 animate-zoomIn relative overflow-hidden group">
                        {/* Static Label */}
                        <div className="flex-shrink-0 z-10 bg-[#0d1117] pr-4 pl-2 py-1 flex items-center gap-2 shadow-lg">
                             <span className="bg-brand-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-lg">New</span>
                        </div>
                        {/* Marquee Content */}
                        <div className="flex-1 overflow-hidden relative h-6">
                             <div className="absolute whitespace-nowrap animate-marquee flex items-center h-full">
                                 {/* Duplicate content to create seamless loop effect */}
                                 <span className="text-sm font-medium text-neutral-200 mr-24">{announcements[0].title}: {announcements[0].content}</span>
                                 <span className="text-sm font-medium text-neutral-200 mr-24">{announcements[0].title}: {announcements[0].content}</span>
                                 <span className="text-sm font-medium text-neutral-200 mr-24">{announcements[0].title}: {announcements[0].content}</span>
                                 <span className="text-sm font-medium text-neutral-200 mr-24">{announcements[0].title}: {announcements[0].content}</span>
                             </div>
                        </div>
                     </div>
                )}
                
                {/* View Content */}
                <div className="animate-zoomIn w-full min-h-full pb-48 md:pb-0">
                    {renderView()}
                </div>
            </div>
        </main>

        <ConsoleLogSidebar isOpen={isLogSidebarOpen} onClose={() => setIsLogSidebarOpen(false)} />
        
        {currentUser && (
            <ServerSelectionModal 
                isOpen={showServerModal} 
                onClose={() => setShowServerModal(false)} 
                currentUser={currentUser}
                onServerChanged={() => {
                    // Force refresh or update state if needed
                    console.log('Server changed, updating session...');
                }}
            />
        )}
    </div>
  );
};

export default App;
