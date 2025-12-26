import React, { useState, useEffect } from 'react';
import { type TutorialContent, type PlatformStatus, type Announcement, type PlatformSystemStatus } from '../../types';
import { getContent, saveContent, getPlatformStatus, savePlatformStatus, getAnnouncements, saveAnnouncements } from '../../services/contentService';
import { ImageIcon, TrashIcon, ChevronDownIcon } from '../Icons';

const TutorialManagementPanel: React.FC = () => {
  const [content, setContent] = useState<TutorialContent | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const fetchContent = async () => {
        const loadedContent = await getContent();
        setContent(loadedContent);
    };
    fetchContent();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleTutorialChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContent(prev => {
      if (!prev) return null;
      const newTutorials = [...prev.tutorials];
      newTutorials[index] = { ...newTutorials[index], [name]: value };
      return { ...prev, tutorials: newTutorials };
    });
  };

  const handleThumbnailUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setContent(prev => {
          if (!prev) return null;
          const newTutorials = [...prev.tutorials];
          newTutorials[index] = { ...newTutorials[index], thumbnailUrl: dataUrl };
          return { ...prev, tutorials: newTutorials };
        });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleRemoveThumbnail = (index: number) => {
    setContent(prev => {
      if (!prev) return null;
      const newTutorials = [...prev.tutorials];
      newTutorials[index] = { ...newTutorials[index], thumbnailUrl: "" };
      return { ...prev, tutorials: newTutorials };
    });
  };

  const handleSave = async () => {
    if (content) {
      setSaveStatus('saving');
      await saveContent(content);
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    }
  };
  
  if (!content) {
    return <div>Loading content editor...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-md">
        <h3 className="font-semibold text-lg">Main Section</h3>
        <div>
          <label htmlFor="mainVideoUrl" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Main YouTube Video URL</label>
          <input
            id="mainVideoUrl"
            name="mainVideoUrl"
            type="text"
            value={content.mainVideoUrl}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="mainTitle" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Main Title</label>
          <input
            id="mainTitle"
            name="mainTitle"
            type="text"
            value={content.mainTitle}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="mainDescription" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Main Description</label>
          <textarea
            id="mainDescription"
            name="mainDescription"
            rows={3}
            value={content.mainDescription}
            onChange={handleInputChange}
            className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-semibold text-lg">Tutorials 1-6</h3>
        {content.tutorials.map((tutorial, index) => (
          <div key={index} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-md space-y-4">
            <h4 className="font-semibold">Tutorial {index + 1}</h4>
            <div>
              <label htmlFor={`title-${index}`} className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Title</label>
              <input
                id={`title-${index}`}
                name="title"
                type="text"
                value={tutorial.title}
                onChange={(e) => handleTutorialChange(index, e)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor={`description-${index}`} className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Description</label>
              <textarea
                id={`description-${index}`}
                name="description"
                rows={2}
                value={tutorial.description}
                onChange={(e) => handleTutorialChange(index, e)}
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
             <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Thumbnail</label>
                <div className="flex items-center gap-4">
                    <div className="w-32 h-20 bg-neutral-200 dark:bg-neutral-700 rounded flex items-center justify-center overflow-hidden">
                        {tutorial.thumbnailUrl ? (
                            <img src={tutorial.thumbnailUrl} alt={`Thumbnail for ${tutorial.title}`} className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-neutral-500" />
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="cursor-pointer bg-white dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200 px-3 py-1.5 rounded-md text-xs font-semibold border border-neutral-300 dark:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-500 transition-colors">
                            Change Image
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleThumbnailUpload(index, e)}/>
                        </label>
                        {tutorial.thumbnailUrl && (
                            <button 
                              onClick={() => handleRemoveThumbnail(index)} 
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-semibold text-left p-0 bg-transparent border-none"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={handleSave} 
          disabled={saveStatus === 'saving'}
          className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Tutorial Content'}
        </button>
        {saveStatus === 'saved' && <p className="text-sm text-green-600">Changes have been saved!</p>}
      </div>
    </div>
  );
};

const PlatformUpdatesPanel: React.FC = () => {
    const [status, setStatus] = useState<PlatformStatus | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', category: 'General' as Announcement['category'] });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        const fetchData = async () => {
            const [statusData, announcementsData] = await Promise.all([getPlatformStatus(), getAnnouncements()]);
            setStatus(statusData);
            setAnnouncements(announcementsData);
        };
        fetchData();
    }, []);

    const handleStatusChange = (field: keyof PlatformStatus, value: string) => {
        setStatus(prev => prev ? { ...prev, [field]: value, lastUpdated: new Date().toISOString() } : null);
    };

    const handleSaveStatus = async () => {
        if (status) {
            setSaveStatus('saving');
            await savePlatformStatus(status);
            setTimeout(() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 500);
        }
    };
    
    const handleAddAnnouncement = async () => {
        if (!newAnnouncement.title || !newAnnouncement.content) return;
        
        const announcementToAdd: Announcement = {
            ...newAnnouncement,
            id: `anno-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        const updatedAnnouncements = [announcementToAdd, ...announcements];
        setAnnouncements(updatedAnnouncements);
        setNewAnnouncement({ title: '', content: '', category: 'General' });

        await saveAnnouncements(updatedAnnouncements);
    };
    
    const handleDeleteAnnouncement = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            const updatedAnnouncements = announcements.filter(a => a.id !== id);
            setAnnouncements(updatedAnnouncements);
            await saveAnnouncements(updatedAnnouncements);
        }
    };
    
    if (!status) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-semibold">Platform Status & Updates Management</h2>
            
            {/* Status Management */}
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-md space-y-4">
                <h3 className="font-semibold text-lg">Platform Status</h3>
                <div>
                    <label htmlFor="platform-status" className="block text-sm font-medium mb-1">Current Status</label>
                    <select id="platform-status" value={status.status} onChange={(e) => handleStatusChange('status', e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600">
                        <option value="operational">Operational</option>
                        <option value="degraded">Degraded Performance</option>
                        <option value="outage">Major Outage</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="status-message" className="block text-sm font-medium mb-1">Status Message</label>
                    <input id="status-message" type="text" value={status.message} onChange={(e) => handleStatusChange('message', e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600" />
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleSaveStatus} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700">Update Status</button>
                    {saveStatus === 'saved' && <p className="text-sm text-green-600">Status updated!</p>}
                </div>
            </div>

            {/* Announcement Management */}
            <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-md space-y-4">
                <h3 className="font-semibold text-lg">Announcements</h3>
                {/* New Announcement Form */}
                <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-md">
                    <h4 className="font-medium">Post New Announcement</h4>
                    <input type="text" placeholder="Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(p => ({...p, title: e.target.value}))} className="w-full p-2 border rounded-md bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600"/>
                    <textarea placeholder="Content..." value={newAnnouncement.content} onChange={(e) => setNewAnnouncement(p => ({...p, content: e.target.value}))} rows={3} className="w-full p-2 border rounded-md bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600"></textarea>
                    <select value={newAnnouncement.category} onChange={(e) => setNewAnnouncement(p => ({...p, category: e.target.value as Announcement['category']}))} className="w-full p-2 border rounded-md bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600">
                        <option value="New Feature">New Feature</option>
                        <option value="Improvement">Improvement</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="General">General</option>
                    </select>
                    <button onClick={handleAddAnnouncement} className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-700">Post</button>
                </div>

                {/* Existing Announcements List */}
                <div className="space-y-3">
                    {announcements.map(ann => (
                        <div key={ann.id} className="flex justify-between items-start p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-md">
                            <div>
                                <p className="font-bold">{ann.title} <span className="text-xs font-normal text-neutral-500">({ann.category})</span></p>
                                <p className="text-sm mt-1">{ann.content}</p>
                                <p className="text-xs text-neutral-400 mt-2">{new Date(ann.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-2 text-red-500 hover:text-red-700">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ETutorialAdminView: React.FC = () => {
    const [isTutorialsVisible, setIsTutorialsVisible] = useState(false);

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <PlatformUpdatesPanel />
            <hr className="my-8 border-neutral-200 dark:border-neutral-700/50" />
            <div>
              <div 
                  onClick={() => setIsTutorialsVisible(!isTutorialsVisible)}
                  className="flex justify-between items-center cursor-pointer group"
                  aria-expanded={isTutorialsVisible}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsTutorialsVisible(!isTutorialsVisible) }}
              >
                  <h2 className="text-xl font-semibold group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">e-Tutorial Content Management</h2>
                  <ChevronDownIcon className={`w-6 h-6 text-neutral-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-transform duration-300 ${isTutorialsVisible ? 'rotate-180' : ''}`} />
              </div>

              <div className={`grid overflow-hidden transition-all duration-500 ease-in-out ${isTutorialsVisible ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                      <div className="pt-2">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                              Update the content displayed on the e-Tutorial page.
                          </p>
                          <TutorialManagementPanel />
                      </div>
                  </div>
              </div>
            </div>
        </div>
    );
};

export default ETutorialAdminView;