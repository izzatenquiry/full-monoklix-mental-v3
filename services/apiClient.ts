
import { addLogEntry } from './aiLogService';
import { type User } from '../types';
import { supabase } from './supabaseClient';
import { PROXY_SERVER_URLS } from './serverConfig';
import { solveCaptcha } from './antiCaptchaService';

export const getVeoProxyUrl = (): string => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  const userSelectedProxy = sessionStorage.getItem('selectedProxyServer');
  if (userSelectedProxy) {
      return userSelectedProxy;
  }
  // Default if nothing selected - Use a known active server (s1)
  return 'https://s1.monoklix.com';
};

export const getImagenProxyUrl = (): string => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  const userSelectedProxy = sessionStorage.getItem('selectedProxyServer');
  if (userSelectedProxy) {
      return userSelectedProxy;
  }
  return 'https://s1.monoklix.com';
};

const getPersonalTokenLocal = (): { token: string; createdAt: string; } | null => {
    try {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
            const user = JSON.parse(userJson);
            if (user && user.personalAuthToken && typeof user.personalAuthToken === 'string' && user.personalAuthToken.trim().length > 0) {
                return { token: user.personalAuthToken, createdAt: 'personal' };
            }
        }
    } catch (e) {
        console.error("Could not parse user from localStorage to get personal token", e);
    }
    return null;
};

// Fallback: Fetch fresh token from DB if missing locally
const getFreshPersonalTokenFromDB = async (): Promise<string | null> => {
    try {
        const userJson = localStorage.getItem('currentUser');
        if (!userJson) {
            console.warn('[API Client] No currentUser in localStorage');
            return null;
        }
        
        const user = JSON.parse(userJson);
        if (!user || !user.id) {
            console.warn('[API Client] User object invalid or missing ID');
            return null;
        }

        console.log(`[API Client] Fetching token for user ${user.id} from DB...`);
        const { data, error } = await supabase
            .from('users')
            .select('personal_auth_token')
            .eq('id', user.id)
            .single();
            
        if (error) {
            console.error('[API Client] Supabase error fetching token:', error);
            return null;
        }

        if (data && data.personal_auth_token) {
            // Update local storage to prevent future fetches
            const updatedUser = { ...user, personalAuthToken: data.personal_auth_token };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            console.log('[API Client] Refreshed personal token from DB and updated localStorage.');
            return data.personal_auth_token;
        } else {
            console.warn('[API Client] DB query returned no token (null/empty).');
        }
    } catch (e) {
        console.error("[API Client] Exception refreshing token from DB", e);
    }
    return null;
};

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

/**
 * Get reCAPTCHA token from anti-captcha.com if enabled
 * Returns null if anti-captcha is disabled or if there's an error
 * @param projectId - Optional project ID to use for captcha solving (must match request body)
 */
const getRecaptchaToken = async (projectId?: string, onStatusUpdate?: (status: string) => void): Promise<string | null> => {
    try {
        // Check if anti-captcha is enabled
        const enabled = localStorage.getItem('antiCaptchaEnabled') === 'true';
        if (!enabled) {
            return null;
        }

        const apiKey = localStorage.getItem('antiCaptchaApiKey') || '';
        if (!apiKey.trim()) {
            console.warn('[API Client] Anti-Captcha enabled but no API key configured');
            return null;
        }

        // Use projectId from parameter (from request body), fallback to localStorage, then undefined (will auto-generate)
        const finalProjectId = projectId || localStorage.getItem('antiCaptchaProjectId') || undefined;

        if (onStatusUpdate) onStatusUpdate('Solving reCAPTCHA...');
        console.log('[API Client] Getting reCAPTCHA token from anti-captcha.com...');
        if (finalProjectId) {
            console.log(`[API Client] Using projectId: ${finalProjectId.substring(0, 8)}...`);
        }

        const token = await solveCaptcha({
            apiKey: apiKey.trim(),
            projectId: finalProjectId
        });

        console.log('[API Client] ✅ reCAPTCHA token obtained');
        return token;
    } catch (error) {
        console.error('[API Client] Failed to get reCAPTCHA token:', error);
        // Don't throw error, just return null and let request proceed without captcha token
        // Server might handle it differently
        return null;
    }
};

// --- EXECUTE REQUEST (STRICT PERSONAL TOKEN ONLY) ---

export const executeProxiedRequest = async (
  relativePath: string,
  serviceType: 'veo' | 'imagen',
  requestBody: any,
  logContext: string,
  specificToken?: string,
  onStatusUpdate?: (status: string) => void,
  overrideServerUrl?: string // New parameter to force a specific server
): Promise<{ data: any; successfulToken: string; successfulServerUrl: string }> => {
  const isStatusCheck = logContext === 'VEO STATUS';
  
  if (!isStatusCheck) {
      console.log(`[API Client] Starting process for: ${logContext}`);
  }
  
  // Use override URL if provided, otherwise default to standard proxy selection
  const currentServerUrl = overrideServerUrl || (serviceType === 'veo' ? getVeoProxyUrl() : getImagenProxyUrl());
  
  // 1. Get reCAPTCHA token if needed (for generation/upload requests)
  const isGenerationRequest = logContext.includes('GENERATE') || logContext.includes('RECIPE') || logContext.includes('UPLOAD');
  let recaptchaToken: string | null = null;

  if (isGenerationRequest) {
    // Extract projectId from request body if exists (MUST match for Google API validation)
    const projectIdFromBody = requestBody.clientContext?.projectId;

    recaptchaToken = await getRecaptchaToken(projectIdFromBody, onStatusUpdate);

    // Inject reCAPTCHA token into request body if available
    if (recaptchaToken && requestBody.clientContext) {
      requestBody.clientContext.recaptchaToken = recaptchaToken;
      requestBody.clientContext.sessionId = requestBody.clientContext.sessionId || `;${Date.now()}`;
      console.log('[API Client] ✅ Injected reCAPTCHA token into request');
    }
  }

  // 2. Acquire Server Slot (Rate Limiting at Server Level)
  if (isGenerationRequest) {
    if (onStatusUpdate) onStatusUpdate('Queueing...');
    try {
        await supabase.rpc('request_generation_slot', { cooldown_seconds: 10, server_url: currentServerUrl });
    } catch (slotError) {
        console.warn('Slot request failed, proceeding anyway:', slotError);
    }
    if (onStatusUpdate) onStatusUpdate('Processing...');
  }
  
  // 3. Resolve Token
  let finalToken = specificToken;
  let sourceLabel: 'Specific' | 'Personal' = 'Specific';

  if (!finalToken) {
      // Step A: Check Local Storage
      const personalLocal = getPersonalTokenLocal();
      if (personalLocal) {
          finalToken = personalLocal.token;
          sourceLabel = 'Personal';
      }

      // Step B: If local missing, check Database
      if (!finalToken) {
          const freshToken = await getFreshPersonalTokenFromDB();
          if (freshToken) {
              finalToken = freshToken;
              sourceLabel = 'Personal';
          }
      }
  }

  if (!finalToken) {
      console.error(`[API Client] Authentication failed. No token found in LocalStorage or DB.`);
      throw new Error(`Authentication failed: No Personal Token found. Please go to Settings > Token & API and set your token.`);
  }

  // 4. Log
  if (!isStatusCheck && sourceLabel === 'Personal') {
      // console.log(`[API Client] Using Personal Token: ...${finalToken.slice(-6)}`);
  }

  const currentUser = getCurrentUserInternal();

  // 5. Execute
  try {
      const endpoint = `${currentServerUrl}/api/${serviceType}${relativePath}`;
      
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${finalToken}`,
              'x-user-username': currentUser?.username || 'unknown',
          },
          body: JSON.stringify(requestBody),
      });

      let data;
      const textResponse = await response.text();
      try {
          data = JSON.parse(textResponse);
      } catch {
          data = { error: { message: `Proxy returned non-JSON (${response.status}): ${textResponse.substring(0, 100)}` } };
      }

      if (!response.ok) {
          const status = response.status;
          let errorMessage = data.error?.message || data.message || `API call failed (${status})`;
          const lowerMsg = errorMessage.toLowerCase();

          // Check for hard errors
          if (status === 400 || lowerMsg.includes('safety') || lowerMsg.includes('blocked')) {
              console.warn(`[API Client] 🛑 Non-retriable error (${status}). Prompt issue.`);
              throw new Error(`[${status}] ${errorMessage}`);
          }
          
          throw new Error(errorMessage);
      }

      if (!isStatusCheck) {
          console.log(`✅ [API Client] Success using ${sourceLabel} token on ${currentServerUrl}`);
      }
      return { data, successfulToken: finalToken, successfulServerUrl: currentServerUrl };

  } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isSafetyError = errMsg.includes('[400]') || errMsg.toLowerCase().includes('safety') || errMsg.toLowerCase().includes('blocked');

      if (!specificToken && !isSafetyError && !isStatusCheck) {
          addLogEntry({ 
              model: logContext, 
              prompt: `Failed using ${sourceLabel} token`, 
              output: errMsg, 
              tokenCount: 0, 
              status: 'Error', 
              error: errMsg 
          });
      }
      throw error;
  }
};
