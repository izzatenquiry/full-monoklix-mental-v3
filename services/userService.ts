
import { type User, type LoginResult, UserRole, UserStatus } from '../types';
import { supabase, type Database } from './supabaseClient';
import { loadData } from './indexedDBService';
import { MODELS } from './aiConfig';
import { APP_VERSION } from './appConfig';
import { v4 as uuidv4 } from 'uuid';
import { getProxyServers } from './contentService';
import { PROXY_SERVER_URLS } from './serverConfig';

// FIX: Correctly reference the 'users' table as defined in the Supabase types.
type UserProfileData = Database['public']['Tables']['users']['Row'];

/**
 * Helper to extract a readable error message from various error types.
 * @param error The error object.
 * @returns A readable string message.
 */
const getErrorMessage = (error: unknown): string => {
    let message = 'An unknown error occurred.';
    if (error instanceof Error) {
        message = error.message;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        message = (error as any).message;
    } else if (typeof error === 'string') {
        message = error;
    } else {
        try {
            message = JSON.stringify(error);
        } catch {
            // Fallback if stringify fails (e.g., circular reference)
            message = 'Unserializable error object.';
        }
    }
    return message;
};

/**
 * Maps a user profile from the database to the application's User type.
 */
const mapProfileToUser = (
  profile: UserProfileData
): User => {
  return {
    id: profile.id,
    email: profile.email,
    createdAt: profile.created_at,
    username: (profile.email || '').split('@')[0], // Fallback username
    fullName: profile.full_name || undefined,
    phone: profile.phone,
    role: profile.role as UserRole,
    status: profile.status as UserStatus,
    apiKey: profile.api_key,
    avatarUrl: profile.avatar_url || undefined,
    subscriptionExpiry: profile.subscription_expiry ? new Date(profile.subscription_expiry).getTime() : undefined,
    totalImage: profile.total_image ?? undefined,
    totalVideo: profile.total_video ?? undefined,
    lastSeenAt: profile.last_seen_at || undefined,
    forceLogoutAt: profile.force_logout_at || undefined,
    appVersion: profile.app_version || undefined,
    personalAuthToken: profile.personal_auth_token || undefined,
    proxyServer: profile.proxy_server || undefined,
    batch_02: profile.batch_02 || undefined,
    lastDevice: profile.last_device || undefined,
  };
};

// Log in a user by checking their email directly against the database.
export const loginUser = async (email: string): Promise<LoginResult> => {
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail) {
        return { success: false, message: 'emailRequired' };
    }
    
    // FIX: Use the correct table name 'users'.
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanedEmail)
        .single();
    
    if (userData && !userError) {
        const typedData = userData as UserProfileData;
        const user = mapProfileToUser(typedData);
        return { success: true, user };
    }

    return { success: false, message: 'emailNotRegistered' };
};

// Get a specific user profile by ID (refresh data)
export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) {
        console.error('Error fetching user profile:', getErrorMessage(error));
        return null;
    }

    return mapProfileToUser(data as UserProfileData);
};

// Sign out the current user (clears Supabase session)
export const signOutUser = async (): Promise<void> => {
    // Session is managed in App.tsx via localStorage. No Supabase call needed.
    // This function is kept for structural consistency if called from somewhere.
    return Promise.resolve();
};

// Get all users (for admin dashboard)
export const getAllUsers = async (): Promise<User[] | null> => {
    // FIX: Use the correct table name 'users'.
    const { data, error } = await supabase.from('users').select('*');

    if (error) {
        console.error('Error getting all users:', getErrorMessage(error));
        return null;
    }

    return (data as UserProfileData[]).map(profile => mapProfileToUser(profile));
};

// Update a user's status
export const updateUserStatus = async (userId: string, status: UserStatus): Promise<boolean> => {
    const updatePayload: { status: UserStatus; subscription_expiry?: string | null } = { status: status };

    // If status is NOT subscription, clear the expiry date.
    if (status !== 'subscription') {
        updatePayload.subscription_expiry = null;
    }

    // FIX: Use the correct table name 'users'.
    const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', userId);

    if (error) {
        console.error("Failed to update status:", getErrorMessage(error));
        return false;
    }
    return true;
};

/**
 * Sets a user to the 'subscription' status and calculates their expiry date.
 */
export const updateUserSubscription = async (userId: string, expiryMonths: 6 | 12): Promise<boolean> => {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

    // FIX: Use the correct table name 'users'.
    const { error } = await supabase
        .from('users')
        .update({ status: 'subscription', subscription_expiry: expiryDate.toISOString() })
        .eq('id', userId);

    if (error) {
        console.error("Failed to update subscription:", getErrorMessage(error));
        return false;
    }
    return true;
};


/**
 * Triggers a remote logout for a user by setting the `force_logout_at` timestamp.
 * This does not change their account status.
 */
export const forceUserLogout = async (userId: string): Promise<boolean> => {
    // FIX: Use the correct table name 'users'.
    const { error } = await supabase
        .from('users')
        .update({ force_logout_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) {
        console.error("Failed to force logout:", getErrorMessage(error));
        return false;
    }
    return true;
};

// Update user profile details (non-sensitive)
export const updateUserProfile = async (
  userId: string,
  updates: { fullName?: string; email?: string; avatarUrl?: string }
): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    
    const profileUpdates: { full_name?: string; avatar_url?: string } = {};
    if (updates.fullName) profileUpdates.full_name = updates.fullName;
    if (updates.avatarUrl) profileUpdates.avatar_url = updates.avatarUrl;

    // FIX: Use the correct table name 'users'.
    const { data: updatedData, error } = await supabase
        .from('users')
        .update(profileUpdates)
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        return { success: false, message: getErrorMessage(error) };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData);
    
    return { success: true, user: updatedProfile };
};


/**
 * Replaces the entire user database with an imported list.
 */
export const replaceUsers = async (importedUsers: User[]): Promise<{ success: boolean; message: string }> => {
    try {
        if (!Array.isArray(importedUsers)) {
            return { success: false, message: 'Import file must be an array of users.' };
        }
        
        // FIX: Correctly reference the 'users' table for insert type.
        const profilesToInsert: Database['public']['Tables']['users']['Insert'][] = importedUsers.map(user => ({
            id: user.id,
            created_at: user.createdAt,
            full_name: user.fullName || null,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            api_key: user.apiKey || null,
            avatar_url: user.avatarUrl || null,
            subscription_expiry: user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toISOString() : null,
            total_image: user.totalImage || 0,
            total_video: user.totalVideo || 0,
            batch_02: user.batch_02 || null,
        }));
        
        // FIX: Use the correct table name 'users'.
        const { error: deleteError } = await supabase.from('users').delete().not('role', 'eq', 'admin');
        if (deleteError) throw deleteError;

        // FIX: Use the correct table name 'users'.
        const { error: insertError } = await supabase.from('users').insert(profilesToInsert);
        if (insertError) throw insertError;

        return { success: true, message: 'User database successfully imported.' };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to import users:", message);
        return { success: false, message: `An error occurred during import: ${message}` };
    }
};

export const exportAllUserData = async (): Promise<UserProfileData[] | null> => {
     // FIX: Use the correct table name 'users'.
     const { data, error } = await supabase.from('users').select('*');
     if (error) {
        console.error('Error exporting user data:', getErrorMessage(error));
        return null;
     }
     return data as UserProfileData[];
};

/**
 * Initializes/repairs the admin account.
 */
export const initializeAdminAccount = async () => {
    const adminEmail = 'izzat.enquiry@gmail.com';
    
    // FIX: Use the correct table name 'users'.
    const { data: adminUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminEmail)
        .eq('role', 'admin')
        .single();
        
    if (findError || !adminUser) {
        console.warn('Admin user profile not found in public.users. Manual creation may be needed if this is the first run.');
        return;
    }
    
    const adminUserId = adminUser.id;

    // FIX: Correctly reference the 'users' table for insert type.
    const profileData: Database['public']['Tables']['users']['Insert'] = {
        id: adminUserId,
        full_name: 'MONOklix Admin',
        email: adminEmail,
        phone: '+601111303527', // Default phone
        role: 'admin',
        status: 'admin',
    };
    
    // FIX: Use the correct table name 'users'.
    const { error: upsertError } = await supabase.from('users').upsert(profileData, { onConflict: 'id' });

    if (upsertError) {
        console.error('Failed to upsert admin profile:', getErrorMessage(upsertError));
    }
};

// Update user's personal auth token
export const saveUserPersonalAuthToken = async (
  userId: string,
  token: string | null
): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    // FIX: Use the correct table name 'users'.
    const { data: updatedData, error } = await supabase
        .from('users')
        .update({ personal_auth_token: token })
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        const message = getErrorMessage(error);
        // Check for the specific schema error
        if (message.includes("column") && message.includes("does not exist")) {
             if (message.includes('personal_auth_token')) {
                 return { success: false, message: 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' };
             }
        }
        return { success: false, message: message };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData);
    
    return { success: true, user: updatedProfile };
};

/**
 * Assigns a personal auth token to a user and increments the usage count for that token.
 * This version uses a database function (RPC) to perform an atomic check-and-increment,
 * which is the robust solution to prevent race conditions.
 * @param userId The ID of the user.
 * @param token The token string to assign.
 * @returns The updated user object on success.
 */
export const assignPersonalTokenAndIncrementUsage = async (userId: string, token: string): Promise<{ success: true; user: User } | { success: false, message: string }> => {
    try {
        // Step 1: Atomically increment the token count using a database function (RPC).
        const { data: rpcSuccess, error: rpcError } = await supabase.rpc(
            'increment_token_if_available', 
            { token_to_check: token }
        );

        if (rpcError) {
            throw new Error(`Database function error: ${rpcError.message}. Ensure the 'increment_token_if_available' function exists in Supabase.`);
        }
        
        if (rpcSuccess !== true) {
            // This is not an error, but a normal race condition outcome. The slot was taken.
            const message = `Token usage limit was reached at the time of assignment. Trying next token.`;
            console.log(`Token slot for ...${token.slice(-6)} was taken by another user. Trying next token.`);
            return { success: false, message: message };
        }

        // Step 2: If the increment was successful, assign the token to the user.
        // FIX: Use the correct table name 'users'.
        const { data: updatedUserData, error: userUpdateError } = await supabase
            .from('users')
            .update({ personal_auth_token: token })
            .eq('id', userId)
            .select()
            .single();
        
        if (userUpdateError) {
             console.error("CRITICAL: Failed to assign token to user AFTER incrementing count. Manual DB correction may be needed for token:", token);
             
             const message = getErrorMessage(userUpdateError);
             if (message.includes("column") && message.includes("does not exist")) {
                 if (message.includes('personal_auth_token')) {
                     return { success: false, message: 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' };
                 }
             }
             throw userUpdateError;
        }

        if (!updatedUserData) {
            throw new Error(`User with ID ${userId} not found after update. Assignment may have failed due to database permissions (RLS).`);
        }

        const user = mapProfileToUser(updatedUserData as UserProfileData);
        return { success: true, user };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to assign token and increment usage:", message);
        
        if (message.includes('DB_SCHEMA_MISSING_COLUMN_personal_auth_token')) {
            return { success: false, message: 'DB_SCHEMA_MISSING_COLUMN_personal_auth_token' };
        }
        
        return { success: false, message };
    }
};

/**
 * Assigns a personal auth token from the IMAGEN pool to a user.
 * @param userId The ID of the user.
 * @param token The token string to assign.
 * @returns The updated user object on success.
 */
export const assignImagenTokenAndIncrementUsage = async (userId: string, token: string): Promise<{ success: true; user: User } | { success: false, message: string }> => {
    try {
        const { data: rpcSuccess, error: rpcError } = await supabase.rpc(
            'increment_imagen_token_if_available', 
            { token_to_check: token }
        );

        if (rpcError) {
            throw new Error(`Database function error: ${rpcError.message}. Ensure the 'increment_imagen_token_if_available' function exists.`);
        }
        
        if (rpcSuccess !== true) {
            const message = `Token usage limit was reached at the time of assignment.`;
            return { success: false, message: message };
        }

        const { data: updatedUserData, error: userUpdateError } = await supabase
            .from('users')
            .update({ personal_auth_token: token })
            .eq('id', userId)
            .select()
            .single();
        
        if (userUpdateError) {
             console.error("CRITICAL: Failed to assign IMAGEN token to user AFTER incrementing count. Manual DB correction may be needed for token:", token);
             throw userUpdateError;
        }

        if (!updatedUserData) {
            throw new Error(`User with ID ${userId} not found after update.`);
        }

        const user = mapProfileToUser(updatedUserData as UserProfileData);
        return { success: true, user };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to assign imagen token and increment usage:", message);
        return { success: false, message };
    }
};


/**
 * Type definition for the structured details of an AI generation log.
 * Keys use snake_case to match the database schema directly.
 */
type AiGenerationLogData = {
    model: string;
    prompt: string;
    output: string;
    token_count: number;
    status: 'Success' | 'Error';
    error_message?: string | null;
};

/**
 * Logs a user activity to the Supabase database.
 * This is a fire-and-forget operation; errors are logged to the console but not thrown.
 * @param activity_type Describes the activity ('login' or 'ai_generation').
 * @param details An optional structured object for AI generation activities.
 */
export const logActivity = async (
    activity_type: 'login' | 'ai_generation',
    details?: AiGenerationLogData
): Promise<void> => {
    const getCurrentUserInternal = (): User | null => {
        try {
            const savedUserJson = localStorage.getItem('currentUser');
            if (savedUserJson) {
                const user = JSON.parse(savedUserJson) as User;
                if (user && user.id) {
                    return user;
                }
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage for activity log.", error);
        }
        return null;
    };

    const user = getCurrentUserInternal();

    if (!user) {
        // Fail silently if no user. We don't want to block user actions for logging.
        // console.warn('Could not log activity: user not found.');
        return;
    }

    try {
        const baseLog = {
            user_id: user.id,
            username: user.username,
            email: user.email,
            activity_type,
        };

        // Conditionally add details for AI generation logs
        const logData = activity_type === 'ai_generation' && details
            ? { ...baseLog, ...details }
            : baseLog;

        // FIX: Use the correct table name 'activity_log'.
        const { error } = await supabase
            .from('activity_log')
            .insert(logData);
        
        if (error) {
            // Silenced logs per user request
            // console.error('Failed to log activity to Supabase:', error.message);
        }
    } catch (e) {
        // Silenced logs per user request
        // console.error('Exception during activity logging:', e);
    }
};

/**
 * Fetches the most recent VEO 3.0 auth tokens from the Supabase auth_token table.
 * @returns {Promise<{ token: string; createdAt: string; totalUser: number }[] | null>} An array of token objects or null if not found/error.
 */
export const getVeoAuthTokens = async (): Promise<{ token: string; createdAt: string; totalUser: number }[] | null> => {
    // FIX: Use the correct table name 'token_new_active'.
    const { data, error } = await supabase
        .from('token_new_active')
        .select('token, created_at, total_user')
        .order('created_at', { ascending: false })
        .limit(25); // UPDATED: Increased limit to 25 as requested

    if (error) {
        console.error('Error getting VEO auth tokens:', getErrorMessage(error));
        return null;
    }

    if (data && data.length > 0) {
        // FIX: With the correct table name, 'data' is now correctly typed, resolving property access errors.
        return data.map(item => ({ 
            token: item.token, 
            createdAt: item.created_at,
            totalUser: item.total_user || 0
        }));
    }
    
    return null;
};

/**
 * Fetches the most recent Imagen auth tokens from the Supabase table.
 * @returns {Promise<{ token: string; createdAt: string }[] | null>} An array of token objects or null if not found/error.
 */
export const getImagenAuthTokens = async (): Promise<{ token: string; createdAt: string }[] | null> => {
    // DISABLED: Per user request, we no longer fetch Imagen specific tokens.
    // The app will rely on the Veo pool or manual assignment.
    return null;
};


/**
 * Fetches the latest shared master API key from the database.
 * This key is used for trial users or users with low usage.
 * @returns {Promise<string | null>} The API key string or null if not found/error.
 */
export const getSharedMasterApiKey = async (): Promise<string | null> => {
    const { data, error } = await supabase
        .from('master_api_key')
        .select('api_key')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error getting shared master API key:', getErrorMessage(error));
        return null;
    }

    return data?.api_key || null;
};

// FIX: Add missing functions and types for ApiGeneratorView.
/**
 * Type definition for an API key available for claiming.
 */
export interface AvailableApiKey {
  id: number;
  apiKey: string;
  createdAt: string;
}

/**
 * Fetches all unclaimed API keys from the database.
 * @returns {Promise<AvailableApiKey[]>} A promise that resolves to an array of available keys.
 */
export const getAvailableApiKeys = async (): Promise<AvailableApiKey[]> => {
    const { data, error } = await supabase
        .from('generated_api_keys')
        .select('id, api_key, created_at')
        .is('claimed_by_user_id', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error getting available API keys:", getErrorMessage(error));
        throw error;
    }

    // FIX: Corrected property access from snake_case (api_key, created_at) to camelCase (apiKey, createdAt) to match the AvailableApiKey interface.
    return data.map(key => ({
        id: key.id,
        apiKey: key.api_key,
        createdAt: key.created_at
    }));
};

/**
 * Claims an available API key for a specific user.
 * @param {number} keyId - The ID of the key to claim.
 * @param {string} userId - The ID of the user claiming the key.
 * @param {string} username - The username of the user claiming the key.
 * @returns {Promise<{ success: boolean; message?: string }>} A promise indicating success or failure.
 */
export const claimApiKey = async (keyId: number, userId: string, username: string): Promise<{ success: boolean; message?: string }> => {
    const { error } = await supabase
        .from('generated_api_keys')
        .update({
            claimed_by_user_id: userId,
            claimed_by_username: username,
            claimed_at: new Date().toISOString()
        })
        .eq('id', keyId)
        .is('claimed_by_user_id', null); // Prevent race conditions

    if (error) {
        console.error('Failed to claim API key:', getErrorMessage(error));
        return { success: false, message: getErrorMessage(error) };
    }
    
    return { success: true };
};

/**
 * Saves a new API key to a user's profile.
 * @param {string} userId - The ID of the user.
 * @param {string} apiKey - The new API key to save.
 * @returns {Promise<{ success: true; user: User } | { success: false; message: string }>} The result of the update.
 */
export const saveUserApiKey = async (userId: string, apiKey: string): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    // FIX: Use the correct table name 'users'.
    const { data: updatedData, error } = await supabase
        .from('users')
        .update({ api_key: apiKey })
        .eq('id', userId)
        .select()
        .single();

    if (error || !updatedData) {
        return { success: false, message: getErrorMessage(error) };
    }
    
    const typedData = updatedData as UserProfileData;
    const updatedProfile = mapProfileToUser(typedData);
    
    return { success: true, user: updatedProfile };
};

export const getAvailableServersForUser = async (user: User): Promise<string[]> => {
    let availableServers = PROXY_SERVER_URLS;

    // Admin gets dynamic list from DB if possible, otherwise falls back to static list
    if (user.role === 'admin') {
        const dynamicList = await getProxyServers();
        if (dynamicList && dynamicList.length > 0) {
            availableServers = dynamicList;
        }
    }

    // RESTRICT S12: Only for Admin or Special Role users
    const s12Url = 'https://s12.monoklix.com';
    // Check for admin OR special_user role.
    // Also checking for 'special user' string just in case user inputs it with space in DB.
    const canAccessVip = user.role === 'admin' || user.role === 'special_user' || (user.role as string) === 'special user';

    if (!canAccessVip) {
        availableServers = availableServers.filter(url => url !== s12Url);
    }

    return availableServers;
};

export const incrementImageUsage = async (user: User): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    try {
        const newCount = Number(user.totalImage || 0) + 1;

        // FIX: Use the correct table name 'users'.
        const { data: updatedData, error } = await supabase
            .from('users')
            .update({ total_image: newCount })
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;
        
        return { success: true, user: mapProfileToUser(updatedData as UserProfileData) };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to increment image usage:", message);
        return { success: false, message };
    }
};

export const incrementVideoUsage = async (user: User): Promise<{ success: true; user: User } | { success: false; message: string }> => {
    try {
        const newCount = Number(user.totalVideo || 0) + 1;

        // FIX: Use the correct table name 'users'.
        const { data: updatedData, error } = await supabase
            .from('users')
            .update({ total_video: newCount })
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, user: mapProfileToUser(updatedData as UserProfileData) };

    } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to increment video usage:", message);
        return { success: false, message };
    }
};

/**
 * Detects the user's device type from the User Agent string.
 * This is exported so App.tsx can use it for smart server routing.
 */
export const getDeviceOS = (): string => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/mac/i.test(ua)) return 'Mac';
    if (/android/i.test(ua)) return 'Android';
    if (/windows phone/i.test(ua)) return 'Windows Phone';
    if (/win/i.test(ua)) return 'Windows PC';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Other';
};

/**
 * Updates the last seen timestamp and device info for a given user. This is a fire-and-forget
 * operation used for tracking user activity.
 * @param {string} userId - The ID of the user to update.
 */
export const updateUserLastSeen = async (userId: string): Promise<void> => {
    try {
        const deviceType = getDeviceOS();
        // FIX: Use the correct table name 'users'.
        const { error } = await supabase
            .from('users')
            .update({ 
                last_seen_at: new Date().toISOString(),
                app_version: APP_VERSION,
                last_device: deviceType
            })
            .eq('id', userId);
        
        if (error) {
            // Silenced logs per user request
            // console.warn('Failed to update last_seen_at:', getErrorMessage(error));
        }
    } catch (error) {
        // Silenced logs per user request
        // console.error('Exception while updating last_seen_at:', getErrorMessage(error));
    }
};

export const getServerUsageCounts = async (): Promise<Record<string, number>> => {
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    // FIX: Use the correct table name 'users'.
    const { data, error } = await supabase
      .from('users')
      .select('proxy_server')
      .not('proxy_server', 'is', null)
      .gte('last_seen_at', fortyFiveMinutesAgo);

    if (error) {
      console.error('Error getting server usage counts:', getErrorMessage(error));
      return {};
    }

    const counts = data.reduce((acc, { proxy_server }) => {
      if (proxy_server) {
        acc[proxy_server] = (acc[proxy_server] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return counts;
};

export const updateUserProxyServer = async (userId: string, serverUrl: string | null): Promise<boolean> => {
    // FIX: Use the correct table name 'users'.
    const { error } = await supabase
        .from('users')
        .update({ proxy_server: serverUrl })
        .eq('id', userId);

    if (error) {
        console.error("Failed to update user's proxy server:", getErrorMessage(error));
        return false;
    }
    return true;
};

/**
 * Marks a token as expired in the database.
 * NOTE: This functionality is currently DISABLED as per user request.
 * The function will do nothing when called.
 * @param token The token string to mark as expired.
 */
export const updateTokenStatusToExpired = async (token: string): Promise<void> => {
    // This functionality is disabled per user request. The function body is empty.
    console.log(`[DISABLED] Skipping marking token ...${token.slice(-6)} as expired.`);
    return Promise.resolve();
};

export const addNewUser = async (userData: { email: string; phone: string; status: UserStatus; fullName: string; role: UserRole; batch_02: string | null }): Promise<{ success: boolean; message?: string, user?: User }> => {
    const { email, phone, status, fullName, role, batch_02 } = userData;
    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail || !phone || !fullName) {
        return { success: false, message: "Full name, email, and phone number are required." };
    }
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanedEmail)
        .single();
        
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "exact one row not found"
        return { success: false, message: getErrorMessage(checkError) };
    }
    
    if (existingUser) {
        return { success: false, message: 'A user with this email already exists.' };
    }

    const newUserProfile: Database['public']['Tables']['users']['Insert'] = {
        id: uuidv4(),
        email: cleanedEmail,
        phone,
        status,
        role: role,
        full_name: fullName,
        total_image: 0,
        total_video: 0,
        batch_02: batch_02 || null,
    };

    const { data: insertedData, error: insertError } = await supabase
        .from('users')
        .insert(newUserProfile)
        .select()
        .single();

    if (insertError || !insertedData) {
        return { success: false, message: getErrorMessage(insertError) };
    }

    const newUser = mapProfileToUser(insertedData as UserProfileData);
    return { success: true, user: newUser };
};

export const removeUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error("Failed to remove user:", getErrorMessage(error));
        return { success: false, message: getErrorMessage(error) };
    }
    return { success: true };
};

export const updateUserBatch02 = async (userId: string, batch_02: string | null): Promise<boolean> => {
    const { error } = await supabase
        .from('users')
        .update({ batch_02 })
        .eq('id', userId);

    if (error) {
        console.error("Failed to update user batch_02:", getErrorMessage(error));
        return false;
    }
    return true;
};

export const addTokenToPool = async (token: string, pool: 'veo' | 'imagen'): Promise<{ success: boolean; message?: string }> => {
    const tableName = pool === 'veo' ? 'token_new_active' : 'token_imagen_only_active';
    
    const { error } = await supabase
        .from(tableName)
        .insert({ token: token, status: 'active', total_user: 0 });

    if (error) {
        return { success: false, message: getErrorMessage(error) };
    }
    return { success: true, message: 'Token added successfully.' };
};

export const deleteTokenFromPool = async (token: string): Promise<{ success: boolean; message?: string }> => {
    // Try deleting from veo pool first
    const { error: veoError } = await supabase
        .from('token_new_active')
        .delete()
        .eq('token', token);

    if (veoError) {
        return { success: false, message: getErrorMessage(veoError) };
    }
    return { success: true };
};

// NEW FUNCTION: Calculate total platform usage
export const getTotalPlatformUsage = async (): Promise<{ totalImages: number; totalVideos: number }> => {
    // MANUALLY DISABLED: Logic temporarily disabled due to data discrepancies.
    // To re-enable, delete this return statement and uncomment the logic block below.
    return { totalImages: 0, totalVideos: 0 };

    /*
    try {
        const { data, error } = await supabase
            .from('users')
            .select('total_image, total_video');

        if (error) throw error;

        let totalImages = 0;
        let totalVideos = 0;

        if (data) {
            data.forEach(user => {
                // FIX: Explicitly cast to Number to prevent string concatenation if DB returns strings
                const imgCount = Number(user.total_image);
                const vidCount = Number(user.total_video);
                
                if (!isNaN(imgCount)) totalImages += imgCount;
                if (!isNaN(vidCount)) totalVideos += vidCount;
            });
        }

        return { totalImages, totalVideos };
    } catch (error) {
        console.error("Failed to fetch platform usage stats:", getErrorMessage(error));
        return { totalImages: 0, totalVideos: 0 };
    }
    */
};
