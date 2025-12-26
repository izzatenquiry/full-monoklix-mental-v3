
import React from 'react';
import { type View, type NavItem, type User, UserStatus, Language } from '../types';
import {
  ImageIcon, VideoIcon, SettingsIcon, HomeIcon, LogoutIcon, GalleryIcon, LogoIcon, XIcon, LibraryIcon, FileTextIcon, GraduationCapIcon, TrendingUpIcon, RobotIcon, MegaphoneIcon, DatabaseIcon, TelegramIcon, ShieldCheckIcon
} from './Icons';
import { APP_VERSION } from '../services/appConfig';
import { getTranslations } from '../services/translations';


const getNavItems = (language: Language): NavItem[] => {
    // FIX: Remove the `language` argument from `getTranslations` call to match the function signature.
    const T = getTranslations().sidebar;
    return [
        { id: 'home', label: T.home, description: T.homeDesc, section: 'main', icon: HomeIcon, isSpecial: true },
        { id: 'get-started', label: T.getStarted, section: 'main', icon: GraduationCapIcon },
        { id: 'ai-text-suite', label: T.aiContentIdea, section: 'free', icon: FileTextIcon },
        { id: 'ai-image-suite', label: T.aiImage, section: 'free', icon: ImageIcon },
        { id: 'ai-video-suite', label: T.aiVideo, section: 'free', icon: VideoIcon },
        { id: 'ai-prompt-library-suite', label: T.promptLibrary, section: 'free', icon: LibraryIcon },
        { id: 'gallery', label: T.imageGallery, section: 'free', icon: GalleryIcon },  
        { id: 'support-group', label: T.supportGroup, section: 'bottom', icon: TelegramIcon, isExternal: true, url: 'https://t.me/+r_PkHl9yRck5NzJl' },
        { id: 'admin-suite', label: "Admin Suite", section: 'admin', icon: ShieldCheckIcon, roles: ['admin'] },
        { id: 'settings', label: T.settings, section: 'bottom', icon: SettingsIcon, roles: ['admin', 'user'] },
        { id: 'logout', label: T.logout, section: 'bottom', icon: LogoutIcon }
    ];
};


interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  onLogout: () => Promise<void>;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onLogout, currentUser, isOpen, onClose, language }) => {
  const navItems = getNavItems(language);
  // FIX: Remove the `language` argument from `getTranslations` call to match the function signature.
  const T = getTranslations().sidebar;

  const handleItemClick = async (viewId: View | 'logout') => {
    if (viewId === 'logout') {
      await onLogout();
    } else {
      setActiveView(viewId as View);
    }
    if (isOpen) {
      onClose();
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isDisabled = false;

    if (item.id === 'support-group' && item.url) {
        return (
            <li key={item.id} className="mt-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 text-left text-sm font-bold bg-[#0088cc] text-white hover:bg-[#0077b5] shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
            </li>
        );
    }

    if (item.isSpecial) {
        const isActive = activeView === 'home';
        return (
            <button 
                key={item.id}
                onClick={() => handleItemClick(item.id as View)}
                className={`w-full p-4 rounded-2xl text-left mb-6 transition-all duration-300 transform group relative overflow-hidden border ${
                isActive
                    ? 'bg-gradient-to-br from-brand-start to-brand-end text-white shadow-glow border-transparent' 
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:shadow-md border-neutral-100 dark:border-neutral-700 hover:border-brand-start/30'
                }`}
            >
                <div className="relative z-10 flex items-center">
                    <div className={`p-2.5 rounded-xl mr-3 ${isActive ? 'bg-white/20 text-white' : 'bg-brand-start/10 text-brand-start'}`}>
                        <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-bold text-sm tracking-wide">{item.label}</p>
                        <p className={`text-xs mt-0.5 font-medium ${isActive ? 'text-white/80' : 'text-neutral-400'}`}>{item.description}</p>
                    </div>
                </div>
            </button>
        );
    }

    const baseClasses = "w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 text-left text-sm font-medium group relative overflow-hidden";
    let stateClasses = "";
    let iconClasses = "w-5 h-5 mr-3 transition-colors duration-200";

    const isActive = activeView === item.id && !item.isExternal;

    if (isDisabled) {
        stateClasses = "opacity-50 cursor-not-allowed text-neutral-400 dark:text-neutral-600";
    } else if (isActive) {
        stateClasses = "bg-brand-start/5 text-brand-start font-bold";
        iconClasses += " text-brand-start";
    } else {
        stateClasses = "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white";
        iconClasses += " text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300";
    }

    const content = (
      <>
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-brand-start to-brand-end rounded-r-full"></div>
        )}
        <item.icon className={iconClasses} />
        <span className="flex-1">{item.label}</span>
        {item.isNew && !isDisabled && <span className="text-[10px] bg-brand-start text-white font-bold px-2 py-0.5 rounded-full shadow-sm ml-2">New</span>}
      </>
    );

    return (
        <li key={item.id} className="mb-1">
            {item.isExternal && item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${baseClasses} ${stateClasses}`}
                >
                  {content}
                </a>
            ) : (
                <button
                  onClick={() => !isDisabled && handleItemClick(item.id as View | 'logout')}
                  disabled={isDisabled}
                  className={`${baseClasses} ${stateClasses}`}
                >
                  {content}
                </button>
            )}
        </li>
    );
  };

  const renderSection = (section: NavItem['section'], title?: string) => {
    const filteredItems = navItems.filter(item => {
        if (item.section !== section) return false;
        if (item.roles && !item.roles.includes(currentUser.role)) return false;
        if (item.disabledForStatus && item.disabledForStatus.includes(currentUser.status)) return false;
        if (item.hideForStatus && item.hideForStatus.includes(currentUser.status)) return false;
        return true;
    });

    if (filteredItems.length === 0) return null;

    return (
    <div className="mb-6">
      {title && <h3 className="px-4 pb-3 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{title}</h3>}
      <ul className="space-y-0.5">
        {filteredItems.map(item => renderNavItem(item))}
      </ul>
    </div>
    );
  }

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      <nav 
        className={`w-72 bg-white dark:bg-neutral-900 h-full flex flex-col transition-transform duration-300 ease-custom-ease z-50 border-r border-neutral-100 dark:border-neutral-800 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
                   lg:relative lg:translate-x-0
                   fixed inset-y-0 left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 pb-2 flex items-center justify-between">
            <LogoIcon className="w-36 text-neutral-900 dark:text-white" />
          <button onClick={onClose} className="lg:hidden p-2 text-neutral-400 hover:text-neutral-600 transition-colors" aria-label={T.closeMenu}>
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          {renderSection('main')}
          {renderSection('free', T.aiAgents)}
          {renderSection('ugc', T.ugcContent)}
          {renderSection('admin', T.admin)}
        </div>
        
        <div className="p-4 mt-auto border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
          <ul className="space-y-1">
            {navItems.filter(i => i.section === 'bottom').map(item => renderNavItem(item))}
          </ul>
          <p className="mt-4 text-center text-neutral-400 dark:text-neutral-600 text-[10px] font-medium tracking-wide">© 2025 MONOklix.com ({APP_VERSION})</p>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
