import type { ComponentType } from 'react';

// FIX: Add Language type for internationalization.
export type Language = 'en' | 'ms';

export type View =
  | 'home'
  | 'get-started'
  // Text suite already exists and handles its own internal views
  | 'ai-text-suite'
  // The new suites for image and video
  | 'ai-image-suite'
  | 'ai-video-suite'
  // New Prompt Library Suite
  | 'ai-prompt-library-suite'
  // Standalone tools/pages
  | 'gallery'
  // Settings & Admin
  | 'settings'
  | 'api-generator'
  | 'master-dashboard'
  | 'token-master'
  | 'admin-suite' // New Admin Suite
  | 'ugc-gen';

// UPDATED: Added 'special_user' role
export type UserRole = 'admin' | 'user' | 'special_user';

// FIX: Expanded UserStatus to include 'subscription' and 'trial' statuses.
export type UserStatus = 'lifetime' | 'admin' | 'inactive' | 'pending_payment' | 'subscription' | 'trial';

export interface NavItem {
  id: View | 'logout' | 'support-group';
  label: string;
  // FIX: Replaced React.ComponentType with ComponentType and added the necessary import.
  icon: ComponentType<{ className?: string }>;
  section: 'main' | 'free' | 'ugc' | 'bottom' | 'admin';
  url?: string;
  isNew?: boolean;
  isExternal?: boolean;
  roles?: UserRole[];
  disabledForStatus?: UserStatus[];
  hideForStatus?: UserStatus[];
  isSpecial?: boolean; // Added for unique styling like the e-course button
  description?: string;
}

// FIX: Added 'Audio' to the HistoryItemType to support it as a valid type for history items.
export type HistoryItemType = 'Image' | 'Video' | 'Storyboard' | 'Canvas' | 'Audio' | 'Copy';

export interface HistoryItem {
  id: string;
  userId?: string; // Made optional to support older history items
  type: HistoryItemType;
  prompt: string;
  // result can be a base64 string for images/canvas, a Blob for video/audio, or plain text for copy/storyboard.
  result: string | Blob; 
  timestamp: number;
}

export interface AiLogItem {
  id: string;
  userId: string;
  timestamp: number;
  model: string;
  prompt: string;
  output: string; // Can be text, a message like "1 image generated", or an error message
  tokenCount: number;
  cost?: number; // Estimated cost in USD, primarily for video generation
  status: 'Success' | 'Error';
  error?: string;
  mediaOutput?: string | Blob; // Base64 string for images, Blob for video/audio.
}

export interface Tutorial {
  title: string;
  description: string;
  thumbnailUrl: string; // Will be an empty string if not set
}

export interface TutorialContent {
  mainVideoUrl: string;
  mainTitle: string;
  mainDescription: string;
  tutorials: Tutorial[];
}

export interface User {
  id: string; // from Supabase auth
  email: string; // from Supabase auth
  createdAt: string; // from Supabase auth
  // from public.users table
  fullName?: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  apiKey?: string | null;
  avatarUrl?: string;
  username: string; // Keeping this for consistency in UI
  subscriptionExpiry?: number; // Kept for legacy trial users, but new registrations won't use it.
  totalImage?: number;
  totalVideo?: number;
  lastSeenAt?: string;
  forceLogoutAt?: string;
  appVersion?: string;
  personalAuthToken?: string | null;
  proxyServer?: string | null;
  batch_02?: string | null;
  lastDevice?: string | null;
}

export type LoginResult = { success: true; user: User } | { success: false; message: string };

export interface Announcement {
  id: string;
  title: string;
  content: string;
  // FIX: Added Malay category names to match their usage in the components.
  category: 'New Feature' | 'Improvement' | 'Maintenance' | 'General' | 'Ciri Baru' | 'Penambahbaikan' | 'Penyelenggaraan' | 'Umum';
  createdAt: string; // ISO string date
}

export type PlatformSystemStatus = 'operational' | 'degraded' | 'outage';

export interface PlatformStatus {
  status: PlatformSystemStatus;
  message: string;
  lastUpdated: string; // ISO string date
}

// FIX: Add missing ErrorModalContent interface.
export interface ErrorModalContent {
  title: string;
  message: string;
  suggestion?: string;
  errorCode?: string;
}

export interface BatchItem {
  prompt: string;
  image?: {
    base64: string;
    mimeType: string;
  };
}

export type BatchProcessorPreset = BatchItem[];

export interface ViralPrompt {
  id: number;
  title: string;
  author: string;
  imageUrl: string;
  prompt: string;
}
