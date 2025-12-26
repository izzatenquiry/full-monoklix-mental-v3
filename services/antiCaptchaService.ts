/**
 * Anti-Captcha Service
 * Integrates with anti-captcha.com API to solve reCAPTCHA v3 Enterprise tokens
 * Required for video/image generation requests to Google API
 */

const ANTICAPTCHA_API_BASE = 'https://api.anti-captcha.com';
const RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
const RECAPTCHA_PAGE_ACTION = 'FLOW_GENERATION';

// Poll settings
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 60; // 2 minutes total

export interface AntiCaptchaConfig {
  apiKey: string;
  projectId?: string; // Optional: custom project ID for tracking
}

export interface CaptchaTaskResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: number;
}

export interface CaptchaResultResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status: 'processing' | 'ready';
  solution?: {
    gRecaptchaResponse: string;
  };
  cost?: string;
  ip?: string;
  createTime?: number;
  endTime?: number;
  solveCount?: number;
}

/**
 * Generate random project ID for reCAPTCHA website URL
 */
function generateProjectId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create reCAPTCHA solving task on anti-captcha.com
 */
async function createCaptchaTask(config: AntiCaptchaConfig): Promise<number> {
  const projectId = config.projectId || generateProjectId();
  const websiteURL = `https://labs.google/fx/tools/flow/project/${projectId}`;

  const payload = {
    clientKey: config.apiKey,
    task: {
      type: 'RecaptchaV3TaskProxyless',
      websiteURL: websiteURL,
      websiteKey: RECAPTCHA_SITE_KEY,
      minScore: 0.9,
      pageAction: RECAPTCHA_PAGE_ACTION,
      isEnterprise: true
    }
  };

  console.log('[Anti-Captcha] Creating task with URL:', websiteURL);

  const response = await fetch(`${ANTICAPTCHA_API_BASE}/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const data: CaptchaTaskResponse = await response.json();

  if (data.errorId > 0) {
    throw new Error(`Anti-Captcha error: ${data.errorDescription || 'Unknown error'}`);
  }

  if (!data.taskId) {
    throw new Error('Anti-Captcha: No taskId received');
  }

  console.log('[Anti-Captcha] Task created, ID:', data.taskId);
  return data.taskId;
}

/**
 * Get result of reCAPTCHA solving task
 */
async function getCaptchaResult(apiKey: string, taskId: number): Promise<CaptchaResultResponse> {
  const payload = {
    clientKey: apiKey,
    taskId: taskId
  };

  const response = await fetch(`${ANTICAPTCHA_API_BASE}/getTaskResult`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const data: CaptchaResultResponse = await response.json();

  if (data.errorId > 0) {
    throw new Error(`Anti-Captcha error: ${data.errorDescription || 'Unknown error'}`);
  }

  return data;
}

/**
 * Poll for captcha result until ready or timeout
 */
async function pollCaptchaResult(apiKey: string, taskId: number): Promise<string> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    // Wait before polling (except first attempt)
    if (attempt > 1) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }

    console.log(`[Anti-Captcha] Polling attempt ${attempt}/${MAX_POLL_ATTEMPTS}...`);

    const result = await getCaptchaResult(apiKey, taskId);

    if (result.status === 'ready' && result.solution?.gRecaptchaResponse) {
      console.log('[Anti-Captcha] ✅ Token received!');
      return result.solution.gRecaptchaResponse;
    }

    if (result.status !== 'processing') {
      throw new Error(`Unexpected status: ${result.status}`);
    }
  }

  throw new Error('Anti-Captcha timeout: Maximum polling attempts reached');
}

/**
 * Main function: Solve reCAPTCHA and return token
 * @param config - Anti-Captcha configuration
 * @returns reCAPTCHA token string
 */
export async function solveCaptcha(config: AntiCaptchaConfig): Promise<string> {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('Anti-Captcha API key is required');
  }

  console.log('[Anti-Captcha] Starting reCAPTCHA solving process...');

  try {
    // Step 1: Create task
    const taskId = await createCaptchaTask(config);

    // Step 2: Poll for result
    console.log('[Anti-Captcha] Waiting for solution...');
    const token = await pollCaptchaResult(config.apiKey, taskId);

    return token;
  } catch (error) {
    console.error('[Anti-Captcha] Error:', error);
    throw error;
  }
}

/**
 * Test Anti-Captcha API key validity
 */
export async function testAntiCaptchaKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const payload = {
      clientKey: apiKey,
      taskId: 0 // Dummy task ID to test API key
    };

    const response = await fetch(`${ANTICAPTCHA_API_BASE}/getTaskResult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data: CaptchaResultResponse = await response.json();

    // If error is about invalid task ID, it means API key is valid
    if (data.errorCode === 'ERROR_TASK_NOT_FOUND' || data.errorCode === 'ERROR_INVALID_TASK_ID') {
      return { valid: true };
    }

    // If error is about API key, it's invalid
    if (data.errorCode === 'ERROR_KEY_DOES_NOT_EXIST' || data.errorCode === 'ERROR_ZERO_BALANCE') {
      return { valid: false, error: data.errorDescription };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
