import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;
const VEO_API_BASE = 'https://aisandbox-pa.googleapis.com/v1';

// ===============================
// 📝 LOGGER
// ===============================
const log = (level, req, ...messages) => {
  const timestamp = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Kuala_Lumpur',
  });
  const username = req ? (req.headers['x-user-username'] || 'anonymous') : 'SYSTEM';
  const prefix = `[${timestamp}] [${username}]`;

  // Stringify objects for better readability
  const processedMessages = messages.map(msg => {
    if (typeof msg === 'object' && msg !== null) {
      try {
        // Truncate long base64 strings in logs
        const tempMsg = JSON.parse(JSON.stringify(msg));
        if (tempMsg?.imageInput?.rawImageBytes?.length > 100) {
            tempMsg.imageInput.rawImageBytes = tempMsg.imageInput.rawImageBytes.substring(0, 50) + '...[TRUNCATED]';
        }
        return JSON.stringify(tempMsg, null, 2);
      } catch (e) {
        return '[Unserializable Object]';
      }
    }
    return msg;
  });

  if (level === 'error') {
    console.error(prefix, ...processedMessages);
  } else {
    console.log(prefix, ...processedMessages);
  }
};


// A helper to safely parse JSON from a response
async function getJson(response, req) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        log('error', req, `❌ Upstream API response is not valid JSON. Status: ${response.status}`);
        log('error', req, `   Body: ${text}`);
        return { 
            error: 'Bad Gateway', 
            message: 'The API returned an invalid (non-JSON) response.', 
            details: text 
        };
    }
}


// ===============================
// 🧩 MIDDLEWARE
// ===============================
app.use(cors({
  origin: [
    'http://localhost:8080',
    'https://dev.monoklix.com',
    'https://monoklix.com'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// ===============================
// 🔍 HEALTH CHECK
// ===============================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===============================
// ========== VEO3 ENDPOINTS ==========
// ===============================

// 🎬 TEXT-TO-VIDEO
app.post('/api/veo/generate-t2v', async (req, res) => {
  log('log', req, '\n🎬 ===== [T2V] TEXT-TO-VIDEO REQUEST =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      log('error', req, '❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    log('log', req, '📤 Forwarding to Veo API...');
    log('log', req, '📦 Request body:', req.body);

    // Log reCAPTCHA token presence for debugging
    if (req.body.clientContext?.recaptchaToken) {
      log('log', req, '🔐 reCAPTCHA token present in request');
    } else {
      log('log', req, '⚠️  No reCAPTCHA token in request');
    }

    const response = await fetch(`${VEO_API_BASE}/video:batchAsyncGenerateVideoText`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await getJson(response, req);
    log('log', req, '📨 Response status:', response.status);
    
    if (!response.ok) {
      log('error', req, '❌ Veo API Error (T2V):', data);
      return res.status(response.status).json(data);
    }

    log('log', req, '✅ [T2V] Success - Operations:', data.operations?.length || 0);
    log('log', req, '=========================================\n');
    res.json(data);
  } catch (error) {
    log('error', req, '❌ Proxy error (T2V):', error);
    res.status(500).json({ error: error.message });
  }
});

// 🖼️ IMAGE-TO-VIDEO
app.post('/api/veo/generate-i2v', async (req, res) => {
  log('log', req, '\n🖼️ ===== [I2V] IMAGE-TO-VIDEO REQUEST =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      log('error', req, '❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    log('log', req, '📦 Request body:', req.body);

    // Log reCAPTCHA token presence for debugging
    if (req.body.clientContext?.recaptchaToken) {
      log('log', req, '🔐 reCAPTCHA token present in request');
    } else {
      log('log', req, '⚠️  No reCAPTCHA token in request');
    }

    const response = await fetch(`${VEO_API_BASE}/video:batchAsyncGenerateVideoStartImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await getJson(response, req);
    log('log', req, '📨 Response status:', response.status);
    
    if (!response.ok) {
      log('error', req, '❌ Veo API Error (I2V):', data);
      return res.status(response.status).json(data);
    }

    log('log', req, '✅ [I2V] Success - Operations:', data.operations?.length || 0);
    log('log', req, '=========================================\n');
    res.json(data);
  } catch (error) {
    log('error', req, '❌ Proxy error (I2V):', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔍 CHECK VIDEO STATUS
app.post('/api/veo/status', async (req, res) => {
  log('log', req, '\n🔍 ===== [STATUS] CHECK VIDEO STATUS =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      log('error', req, '❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    log('log', req, '📦 Payload:', req.body);
    
    const response = await fetch(`${VEO_API_BASE}/video:batchCheckAsyncVideoGenerationStatus`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await getJson(response, req);
    log('log', req, '📨 Response status:', response.status);
    
    if (!response.ok) {
      log('error', req, '❌ Veo API Error (Status):', data);
      return res.status(response.status).json(data);
    }

    if (data.operations?.[0]) {
      log('log', req, '📊 Operation status:', data.operations[0].status, 'Done:', data.operations[0].done);
    }

    log('log', req, '✅ [STATUS] Success');
    log('log', req, '=========================================\n');
    res.json(data);
  } catch (error) {
    log('error', req, '❌ Proxy error (STATUS):', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 VEO UPLOAD IMAGE
app.post('/api/veo/upload', async (req, res) => {
  log('log', req, '\n📤 ===== [VEO UPLOAD] IMAGE UPLOAD =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      log('error', req, '❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    log('log', req, '📤 Mime type:', req.body.imageInput?.mimeType);
    log('log', req, '📤 Aspect ratio:', req.body.imageInput?.aspectRatio);

    // Log reCAPTCHA token presence for debugging
    if (req.body.clientContext?.recaptchaToken) {
      log('log', req, '🔐 reCAPTCHA token present in request');
    } else {
      log('log', req, '⚠️  No reCAPTCHA token in request');
    }

    const response = await fetch(`${VEO_API_BASE}:uploadUserImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await getJson(response, req);
    log('log', req, '📨 Response status:', response.status);
    
    if (!response.ok) {
      log('error', req, '❌ Upload Error:', data);
      return res.status(response.status).json(data);
    }

    const mediaId = data.mediaGenerationId?.mediaGenerationId || data.mediaId;
    log('log', req, '✅ [VEO UPLOAD] Success - MediaId:', mediaId);
    log('log', req, '=========================================\n');
    res.json(data);
  } catch (error) {
    log('error', req, '❌ Proxy error (VEO UPLOAD):', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// ========== IMAGEN ENDPOINTS ==========
// ===============================

// 🎨 GENERATE IMAGE (Imagen T2I)
app.post('/api/imagen/generate', async (req, res) => {
  log('log', req, '\n🎨 ===== [IMAGEN] GENERATE IMAGE =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      log('error', req, '❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    log('log', req, '📤 Forwarding to Imagen API...');
    log('log', req, '📦 Request body:', req.body);

    // Log reCAPTCHA token presence for debugging
    if (req.body.clientContext?.recaptchaToken) {
      log('log', req, '🔐 reCAPTCHA token present in request');
    } else {
      log('log', req, '⚠️  No reCAPTCHA token in request');
    }

    const response = await fetch(`${VEO_API_BASE}/whisk:generateImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await getJson(response, req);
    log('log', req, '📨 Response status:', response.status);
    
    if (!response.ok) {
      log('error', req, '❌ Imagen API Error:', data);
      return res.status(response.status).json(data);
    }

    log('log', req, '✅ [IMAGEN] Success - Generated:', data.imagePanels?.length || 0, 'panels');
    log('log', req, '=========================================\n');
    res.json(data);
  } catch (error) {
    log('error', req, '❌ Proxy error (IMAGEN GENERATE):', error);
    res.status(500).json({ error: error.message });
  }
});

// ✏️ RUN RECIPE (Imagen Edit/Compose)
app.post('/api/imagen/run-recipe', async (req, res) => {
  log('log', req, '\n✏️ ===== [IMAGEN RECIPE] RUN RECIPE =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      log('error', req, '❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    log('log', req, '📤 Forwarding recipe to Imagen API...');
    log('log', req, '📦 Full body:', req.body);

    // Log reCAPTCHA token presence for debugging
    if (req.body.clientContext?.recaptchaToken) {
      log('log', req, '🔐 reCAPTCHA token present in request');
    } else {
      log('log', req, '⚠️  No reCAPTCHA token in request');
    }

    const response = await fetch(`${VEO_API_BASE}/whisk:runImageRecipe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await getJson(response, req);
    log('log', req, '📨 Response status:', response.status);
    
    if (!response.ok) {
      log('error', req, '❌ Imagen Recipe Error:', data);
      return res.status(response.status).json(data);
    }
    
    const panelCount = data.imagePanels?.length || 0;
    const imageCount = data.imagePanels?.[0]?.generatedImages?.length || 0;
    
    log('log', req, '✅ [IMAGEN RECIPE] Success');
    log('log', req, `   Generated ${panelCount} panel(s) with ${imageCount} image(s)`);
    log('log', req, '=========================================\n');
    
    res.json(data);
  } catch (error) {
    log('error', req, '❌ Proxy error (IMAGEN RECIPE):', error);
    res.status(500).json({ error: error.message });
  }
});

// 📤 IMAGEN UPLOAD IMAGE
app.post('/api/imagen/upload', async (req, res) => {
  log('log', req, '\n📤 ===== [IMAGEN UPLOAD] IMAGE UPLOAD =====');
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      log('error', req, '❌ No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const uploadMediaInput = req.body.uploadMediaInput;
    if (uploadMediaInput) {
      log('log', req, '📤 Media category:', uploadMediaInput.mediaCategory);
    }
    log('log', req, '📦 Full request body keys:', Object.keys(req.body));

    // Log reCAPTCHA token presence for debugging
    if (req.body.clientContext?.recaptchaToken) {
      log('log', req, '🔐 reCAPTCHA token present in request');
    } else {
      log('log', req, '⚠️  No reCAPTCHA token in request');
    }

    const response = await fetch(`${VEO_API_BASE}:uploadUserImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/'
      },
      body: JSON.stringify(req.body)
    });

    const data = await getJson(response, req);
    log('log', req, '📨 Response status:', response.status);
    
    if (!response.ok) {
      log('error', req, '❌ Imagen Upload Error:', data);
      return res.status(response.status).json(data);
    }

    const mediaId = data.result?.data?.json?.result?.uploadMediaGenerationId || 
                   data.mediaGenerationId?.mediaGenerationId || 
                   data.mediaId;
    
    log('log', req, '✅ [IMAGEN UPLOAD] Success - MediaId:', mediaId);
    log('log', req, '=========================================\n');
    res.json(data);
  } catch (error) {
    log('error', req, '❌ Proxy error (IMAGEN UPLOAD):', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// 📥 DOWNLOAD VIDEO (CORS BYPASS)
// ===============================
app.get('/api/veo/download-video', async (req, res) => {
  log('log', req, '\n📥 ===== [DOWNLOAD] VIDEO DOWNLOAD =====');
  try {
    const videoUrl = req.query.url;
    
    if (!videoUrl || typeof videoUrl !== 'string') {
      log('error', req, '❌ No URL provided');
      return res.status(400).json({ error: 'Video URL is required' });
    }

    log('log', req, '📥 Video URL:', videoUrl);
    log('log', req, '📥 Fetching and streaming from Google Storage...');

    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      log('error', req, '❌ Failed to fetch video:', response.status, response.statusText);
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Failed to download: ${response.statusText}`, details: errorBody });
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    const filename = `monoklix-video-${Date.now()}.mp4`;

    log('log', req, '📦 Video headers received:', { contentType, contentLength });

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Accept-Ranges', 'bytes');

    response.body.pipe(res);

    response.body.on('end', () => {
      log('log', req, '✅ [DOWNLOAD] Video stream finished to client.');
      log('log', req, '=========================================\n');
    });

    response.body.on('error', (err) => {
      log('error', req, '❌ [DOWNLOAD] Error during video stream pipe:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming video' });
      }
    });

  } catch (error) {
    log('error', req, '❌ Proxy error (DOWNLOAD):', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ===============================
// 🚀 SERVER START
// ===============================
app.listen(PORT, '0.0.0.0', () => {
  const logSystem = (...args) => log('log', null, ...args);

  logSystem('\n🚀 ===================================');
  logSystem('🚀 Veo3 & Imagen Proxy Server STARTED');
  logSystem('🚀 ===================================');
  logSystem(`📍 Port: ${PORT}`);
  logSystem(`📍 Local: http://localhost:${PORT}`);
  logSystem(`📍 Health: http://localhost:${PORT}/health`);
  logSystem('✅ CORS: Allow all origins');
  logSystem('🔧 Debug logging: ENABLED');
  logSystem('===================================\n');
  logSystem('📋 VEO3 Endpoints:');
  logSystem('   POST /api/veo/generate-t2v');
  logSystem('   POST /api/veo/generate-i2v');
  logSystem('   POST /api/veo/status');
  logSystem('   POST /api/veo/upload');
  logSystem('   GET  /api/veo/download-video');
  logSystem('📋 IMAGEN Endpoints:');
  logSystem('   POST /api/imagen/generate');
  logSystem('   POST /api/imagen/run-recipe');
  logSystem('   POST /api/imagen/upload');
  logSystem('===================================\n');
});
