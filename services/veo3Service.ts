
import { v4 as uuidv4 } from 'uuid';
import { executeProxiedRequest } from './apiClient';

interface Veo3Config {
  authToken: string;
  aspectRatio: 'landscape' | 'portrait';
  seed?: number;
  useStandardModel?: boolean;
  serverUrl?: string;
}

interface VideoGenerationRequest {
  prompt: string;
  imageMediaId?: string;
  config: Omit<Veo3Config, 'authToken'> & { authToken?: string };
}

export const generateVideoWithVeo3 = async (
    request: VideoGenerationRequest,
    onStatusUpdate?: (status: string) => void,
    isHealthCheck = false
): Promise<{ operations: any[]; successfulToken: string; successfulServerUrl: string }> => {
  console.log('🎬 [VEO Service] Preparing generateVideoWithVeo3 request...');
  const { prompt, imageMediaId, config } = request;
  const isImageToVideo = !!imageMediaId;

  let videoModelKey: string;
  
  if (isImageToVideo) {
    // Corrected model key based on successful logs: Remove '_landscape' from the landscape key.
    videoModelKey = config.aspectRatio === 'landscape'
      ? 'veo_3_1_i2v_s_fast_ultra'
      : 'veo_3_1_i2v_s_fast_portrait_ultra';
  } else {
    videoModelKey = config.aspectRatio === 'landscape'
      ? 'veo_3_1_t2v_fast_ultra'
      : 'veo_3_1_t2v_fast_portrait_ultra';
  }

  // FIX: API requires the full ENUM string
  const aspectRatioValue = config.aspectRatio === 'landscape'
    ? 'VIDEO_ASPECT_RATIO_LANDSCAPE'
    : 'VIDEO_ASPECT_RATIO_PORTRAIT';

  const seed = config.seed || Math.floor(Math.random() * 2147483647);
  const sceneId = uuidv4();
  const projectId = uuidv4(); // Generate unique project ID for this request

  const requestBody: any = {
    clientContext: {
      sessionId: `;${Date.now()}`, // Required: session ID with timestamp
      projectId: projectId,         // Required: project ID for tracking
      tool: 'PINHOLE',
      userPaygateTier: 'PAYGATE_TIER_TWO'
    },
    requests: [{
      aspectRatio: aspectRatioValue,
      seed: seed,
      textInput: { prompt },
      videoModelKey: videoModelKey,
      metadata: { sceneId: sceneId }
    }]
  };

  if (imageMediaId) {
    requestBody.requests[0].startImage = { mediaId: imageMediaId };
  }

  console.log('🎬 [VEO Service] Constructed T2V/I2V request body. Sending to API client.');
  const relativePath = isImageToVideo ? '/generate-i2v' : '/generate-t2v';
  
  const logContext = isHealthCheck
    ? (isImageToVideo ? 'VEO I2V HEALTH CHECK' : 'VEO T2V HEALTH CHECK')
    : (isImageToVideo ? 'VEO I2V GENERATE' : 'VEO T2V GENERATE');
  
  // If this is an I2V request, we MUST use the token that was used to upload the image (config.authToken).
  // executeProxiedRequest handles this via the `specificToken` param.
  const { data, successfulToken, successfulServerUrl } = await executeProxiedRequest(
    relativePath,
    'veo',
    requestBody,
    logContext,
    config.authToken, 
    onStatusUpdate,
    config.serverUrl // Pass specific server URL if provided
  );
  console.log('🎬 [VEO Service] Received operations from API client:', data.operations?.length || 0);
  return { operations: data.operations || [], successfulToken, successfulServerUrl };
};

export const checkVideoStatus = async (
    operations: any[], 
    token: string, 
    onStatusUpdate?: (status: string) => void,
    serverUrl?: string
) => {
  const payload = { operations };

  const { data } = await executeProxiedRequest(
    '/status',
    'veo',
    payload,
    'VEO STATUS',
    token, // Must use same token as generation
    onStatusUpdate,
    serverUrl // Must use same server as generation
  );
  
  if (data.operations && data.operations.length > 0) {
    data.operations.forEach((op: any, idx: number) => {
      console.log(`📊 Operation ${idx + 1} status:`, {
        status: op.status,
        hasResult: !!(op.result?.generatedVideo || op.result?.generatedVideos),
        hasError: !!op.error,
        operationName: op.name || op.operation?.name
      });
    });
  }

  return data;
};

export const uploadImageForVeo3 = async (
  base64Image: string,
  mimeType: string,
  aspectRatio: 'landscape' | 'portrait',
  onStatusUpdate?: (status: string) => void,
  authToken?: string, // New optional parameter to force a specific token
  serverUrl?: string  // New optional parameter to force a specific server
): Promise<{ mediaId: string; successfulToken: string; successfulServerUrl: string }> => {
  console.log(`📤 [VEO Service] Preparing to upload image for VEO. MimeType: ${mimeType}`);
  // Note: Upload endpoint usually expects the ENUM string, unlike generation endpoint.
  const imageAspectRatioEnum = aspectRatio === 'landscape' 
    ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' 
    : 'IMAGE_ASPECT_RATIO_PORTRAIT';

  const requestBody = {
    imageInput: {
      rawImageBytes: base64Image,
      mimeType: mimeType,
      isUserUploaded: true,
      aspectRatio: imageAspectRatioEnum
    },
    clientContext: {
      sessionId: `;${Date.now()}`, // Required: session ID with timestamp
      tool: 'ASSET_MANAGER'
    }
  };

  const { data, successfulToken, successfulServerUrl } = await executeProxiedRequest(
    '/upload',
    'veo',
    requestBody,
    'VEO UPLOAD',
    authToken, // Use specific token if provided, otherwise null for auto-selection
    onStatusUpdate,
    serverUrl // Use specific server if provided
  );

  const mediaId = data.mediaGenerationId?.mediaGenerationId || data.mediaId;
  
  if (!mediaId) {
    console.error('❌ No mediaId in response:', JSON.stringify(data, null, 2));
    throw new Error('Upload succeeded but no mediaId returned');
  }
  
  console.log(`📤 [VEO Service] Image upload successful. Media ID: ${mediaId} with token ...${successfulToken.slice(-6)}`);
  return { mediaId, successfulToken, successfulServerUrl };
};
