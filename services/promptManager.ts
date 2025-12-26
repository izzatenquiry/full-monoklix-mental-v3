/**
 * This service centralizes all prompt engineering logic.
 * Instead of constructing prompts inside UI components, we define them here.
 * This makes prompts easier to manage, version, and test independently of the UI.
 */
import { type CreativeDirectionState } from './creativeDirectionService';


// --- AI Support ---
export const getSupportPrompt = (): string => `You are a helpful AI Customer Support Agent for MONOklix.com.  
Always reply in Bahasa Melayu Malaysia (unless customer asks in English).  
Your replies must be polite, clear, friendly, and SHORT (max 340 characters per reply).  

Guidelines:
1. Sentiasa mesra, profesional, dan gunakan bahasa mudah.  
2. Jawab step by step untuk bantu user.  
3. Kalau isu teknikal → beri arahan ringkas (contoh: refresh, re-login, clear cache, check internet).  
4. Kalau tak pasti → beritahu akan escalate kepada team teknikal.  
5. Pastikan jawapan mudah difahami oleh user biasa (bukan developer).  

Persona:  
- Tone: Mesra + professional.  
- Style: Ringkas, elakkan jargon teknikal berlebihan.  
- Target: Pengguna biasa.  

Example replies:  
- "Hai 👋 boleh jelaskan masalah anda? Saya cuba bantu."  
- "Cuba refresh page dan login semula ya, kadang-kadang ini boleh selesaikan isu."  
- "Kalau error masih ada, boleh share screenshot? Saya check sama-sama."  
- "Baik, saya escalate isu ni kepada team teknikal kami."`;

// --- Content Ideas ---
export const getContentIdeasPrompt = (topic: string, language: string): string => `
    Generate a list of 5 engaging content ideas (e.g., blog posts, social media updates, video scripts) for the following topic: "${topic}".
    The ideas should be trendy, relevant, and aimed at capturing audience attention. For each idea, provide a catchy title and a brief description of the concept.
    The final output language must be strictly in ${language}.
`;

// --- Marketing Copy ---
export const getMarketingCopyPrompt = (details: {
  productDetails: string;
  targetAudience: string;
  keywords: string;
  selectedTone: string;
  selectedLanguage: string;
}): string => `
    You are an expert marketing copywriter. Generate compelling marketing copy based on the following details.
    The final output language must be strictly in ${details.selectedLanguage}.

    **Product/Service Details:**
    ${details.productDetails}

    **Target Audience:**
    ${details.targetAudience || 'General Audience'}

    **Tone of Voice:**
    ${details.selectedTone}

    **Keywords to include:**
    ${details.keywords || 'None'}

    The copy should be engaging, persuasive, and ready for use in social media posts, advertisements, or website content. Structure the output clearly, perhaps with a headline and body.
`;

// --- Product Ad Storyline ---
export const getProductAdPrompt = (details: {
  productDesc: string;
  language: string;
  vibe: string;
  lighting: string;
  contentType: string;
}): string => `
    You are an expert advertising copywriter and storyboard artist for social media video ads.
    Create a compelling 1-scene storyboard for a video ad based on the provided product image and details.
    The output language for the storyboard must be in ${details.language}.

    **Product Description:**
    ${details.productDesc}

    **Creative Direction:**
    - Vibe: ${details.vibe}
    - Lighting: ${details.lighting}
    - Content Type: ${details.contentType}

    Based on all this information, describe one effective scene. What does the viewer see? What is the voiceover or on-screen text?
    Keep it short, engaging, and optimised for platforms like TikTok or Instagram Reels.
`;

// --- Product Photo (Unified Prompt) ---
export const getProductPhotoPrompt = (details: {
  creativeDirection: CreativeDirectionState;
  customPrompt: string;
}): string => {
  if (details.customPrompt.trim()) {
    return details.customPrompt.trim();
  }

  const { vibe, style, lighting, camera, composition, lensType, filmSim, effect, creativityLevel } = details.creativeDirection;

  const promptParts = [
    `Create a professional, photorealistic product photo for the uploaded image.`,
    `Do not include any people, models, or text. Focus only on the product itself.`,

    `**Creative Direction:**`,
    `- Background / Vibe: ${vibe}`,
    `- Artistic Style: ${style === 'Random' ? 'photorealistic' : style}`,
    `- Lighting: ${lighting === 'Random' ? 'interesting, cinematic lighting' : lighting}`,
    `- Camera Shot: ${camera === 'Random' ? 'a dynamic angle' : camera}`,
    `- Composition: ${composition === 'Random' ? 'well-composed' : composition}`,
    `- Lens Type: ${lensType === 'Random' ? 'standard lens' : lensType}`,
    `- Film Simulation: ${filmSim === 'Random' ? 'modern digital look' : filmSim}`,
    `- Visual Effect: ${effect === 'Random' || effect === 'None' ? 'none' : effect}`,
    `- AI Creativity Level: ${creativityLevel} out of 10 (0 = literal, 10 = full artistic freedom)`,
    
    `**Final Requirements:**`,
    `- The result must be clean, aesthetic, and suitable for e-commerce listings or social media.`,
    `- CRITICAL: The final image must be purely visual. Do NOT add text, watermarks, or logos.`
  ];

  return promptParts.join('\n');
};


// --- Product Review (Unified Prompt) ---
export const getProductReviewStoryboardPrompt = (details: {
  productDesc: string;
  selectedLanguage: string;
  selectedContentType: string;
  includeCaptions: 'Yes' | 'No';
  includeVoiceover: 'Yes' | 'No';
  includeModel: 'Yes' | 'No';
  creativeDirection: CreativeDirectionState;
}): string => {
  const { vibe, style, lighting, camera, composition, lensType, filmSim, effect, creativityLevel } = details.creativeDirection;
  const isMalay = details.selectedLanguage === 'Bahasa Malaysia';
  const sceneTitle = isMalay ? 'Babak' : 'Scene';
  const voiceoverTitle = isMalay ? 'Skrip Suara Latar' : 'Voiceover';
  const captionTitle = isMalay ? 'Kapsyen' : 'Captions';
  const visualTitle = isMalay ? 'Visual' : 'Visuals';

  // Dynamically build the list of required elements and instructions
  const structureElements = [`"**${visualTitle}:**"`];
  let dynamicExtraInstructions = "For each scene, create a description of the visuals.";

  if (details.includeVoiceover === 'Yes') {
    structureElements.push(`"**${voiceoverTitle}:**"`);
    dynamicExtraInstructions += "Also, write a natural-sounding voiceover script (max 120 characters). Local Dialek Bahasa Pasar Malaysia";
  }

  if (details.includeCaptions === 'Yes') {
    structureElements.push(`"**${captionTitle}:**"`);
    dynamicExtraInstructions += "Also, provide short, punchy on-screen captions.";
  }

  return `
You are an expert AI assistant specialising in creating storyboards for social media product review videos.
The output language for all generated text (titles, descriptions, scripts) must be strictly in ${details.selectedLanguage}.

Create a **4-scene storyboard** for a short-form video (TikTok, Instagram Reels, YouTube Shorts) based on the following:

**Product Description:**
${details.productDesc}

**Creative Direction:**
- Include a model in the video: ${details.includeModel}
- Vibe: ${vibe}
- Background Vibe: ${vibe}
- Content Type: ${details.selectedContentType}
- Artistic Style: ${style}
- Lighting: ${lighting}
- Camera Shot Style: ${camera}
- Composition: ${composition}
- Lens Type: ${lensType}
- Film Simulation: ${filmSim}
- Visual Effect: ${effect}
- AI Creativity Level (0-10): ${creativityLevel}
- On-Screen Text/Captions: ${details.includeCaptions}
- Voiceover Script: ${details.includeVoiceover}

**Task:**
${dynamicExtraInstructions}
The storyboard must follow a logical flow:  
1. Introduction (hook & product reveal)  
2. Demonstration / Features  
3. Benefits / User experience  
4. Call-to-action (why buy / final push)

**Output Structure:**
The output must be structured with clear headings for each scene, like "**${sceneTitle} 1:**", "**${sceneTitle} 2:**", etc.
For each scene, you MUST use the following headings for the required elements: ${structureElements.join(', ')}.
`;
};


// --- Product Review Image Prompt (Unified) ---
export const getProductReviewImagePrompt = (details: {
  productDesc: string;
  sceneDescription: string;
  includeModel: 'Yes' | 'No';
  creativeDirection: CreativeDirectionState;
}): string => {
    const { vibe, style, lighting, camera, composition, lensType, filmSim, effect, creativityLevel } = details.creativeDirection;
    const promptParts = [
        'You are an AI image generation expert. Your task is to create a single, photorealistic UGC-style image for a product review video.',
    ];

    if (details.includeModel === 'Yes') {
        promptParts.push(
            'You will composite a person and a product into a new scene.',
            '\n**Provided Assets:**',
            '1. **Person\'s Face:** A reference image of the person to be featured.',
            '2. **Product:** A reference image of the product being reviewed.'
        );
    } else {
        promptParts.push(
            'You will place a product into a new scene. Do not include any people or models.',
            '\n**Provided Assets:**',
            '1. **Product:** A reference image of the product being reviewed.'
        );
    }

    promptParts.push(
        '\n**Product Being Reviewed:**',
        details.productDesc,
        '\n**Scene Description (what is happening):**',
        details.sceneDescription,
        '\n**Creative Direction for the Scene:**',
        `- Vibe: ${vibe}`,
        `- Background Vibe: ${vibe}`,
        `- Lighting: ${lighting}`,
        `- Artistic Style: ${style === 'Random' ? 'photorealistic' : style}`,
        `- Camera Shot: ${camera === 'Random' ? 'a dynamic angle' : camera}`,
        `- Composition: ${composition === 'Random' ? 'well-composed' : composition}`,
        `- Lens Type: ${lensType === 'Random' ? 'standard lens' : lensType}`,
        `- Film Simulation: ${filmSim === 'Random' ? 'modern digital look' : filmSim}`,
        `- Visual Effect: ${effect === 'Random' || effect === 'None' ? 'none' : effect}`,
        `- AI Creativity Level (0-10): ${creativityLevel}`
    );

    promptParts.push('\n**CRITICAL INSTRUCTIONS:**');

    if (details.includeModel === 'Yes') {
        promptParts.push('1. **Face Fidelity:** The person\'s face in the final image **MUST be a photorealistic and exact match** to the face from the provided face reference image. **Do not alter** their facial features, structure, or identity. The final image must look like it features the same person.');
    }

    promptParts.push(
        `${details.includeModel === 'Yes' ? '2.' : '1.'} **Product Integration:** Seamlessly and naturally integrate the product from the product reference image into the scene.`,
        `${details.includeModel === 'Yes' ? '3.' : '2.'} **Final Image Quality:** The result must look like a real, high-quality frame from a short-form video (like TikTok or Reels).`,
        `${details.includeModel === 'Yes' ? '4.' : '3.'} **No Text:** The output image must be purely visual. Do NOT add any text, watermarks, or logos.`
    );

    promptParts.push('\nGenerate only the image that perfectly matches this description.');

    return promptParts.join('\n');
};


// --- TikTok Affiliate Unified Prompt ---
export const getTiktokAffiliatePrompt = (details: {
  gender: string;
  modelFace: string;
  hasFaceImage?: boolean;
  customPrompt: string;
  creativeDirection: CreativeDirectionState;
}): string => {
  if (details.customPrompt.trim()) {
    return details.customPrompt.trim();
  }
  
  const { vibe, style, lighting, camera, composition, lensType, filmSim, pose, creativityLevel } = details.creativeDirection;

  if (details.hasFaceImage) {
    // Use a much stricter prompt when a face is provided to ensure it's preserved.
    return `
You are an AI image generation expert. Your task is to create a single, photorealistic UGC-style image by compositing a person and a product into a new scene.

**Provided Assets:**
1.  **Person's Face:** A reference image of the person to be featured.
2.  **Product:** A reference image of the product.

**Creative Direction for the New Scene:**
-   **Background/Vibe:** ${vibe}
-   **Model's Pose:** ${pose === 'Random' ? 'a natural and relaxed pose, interacting with the product if appropriate' : pose}
-   **Artistic Style:** ${style === 'Random' ? 'photorealistic' : style}
-   **Lighting:** ${lighting === 'Random' ? 'flattering and natural-looking lighting' : lighting}
-   **Camera Shot:** ${camera === 'Random' ? 'a dynamic angle' : camera}
-   **Composition:** ${composition === 'Random' ? 'well-composed' : composition}
-   **Lens Type:** ${lensType === 'Random' ? 'standard lens' : lensType}
-   **Film Simulation:** ${filmSim === 'Random' ? 'modern digital look' : filmSim}
-   **AI Creativity Level (0-10):** ${creativityLevel}

**CRITICAL INSTRUCTIONS:**
1.  **Face Fidelity:** The person's face in the final image **MUST be a photorealistic and exact match** to the face from the provided reference image. **Do not alter** their facial features, structure, or identity. The gender is determined by the face image.
2.  **Product Integration:** Seamlessly and naturally integrate the product into the scene with the person.
3.  **Final Image Quality:** The result must be a high-quality, authentic-looking UGC image suitable for TikTok.
4.  **No Text:** The output image must be purely visual. Do NOT add any text, watermarks, or logos.

Generate only the image that perfectly matches this description.
`;
  } else {
    // The original prompt for when no face is provided (generates a new face).
    const modelInstruction = `A ${details.gender} model with facial features typical of ${details.modelFace === 'Random' ? 'Southeast Asia' : details.modelFace}. Ensure the face looks realistic and appealing.`;
    const productInstruction = "Include the product from the uploaded image.";

    return `
Create a high-quality, photorealistic User-Generated Content (UGC) image suitable for TikTok affiliate marketing.
The image must naturally feature the provided product image.

**Core Instructions:**
1. The main subject is the model and the product together. Integrate the product naturally.
2. ${modelInstruction}
3. The aesthetic must be eye-catching and feel authentic, like real UGC content.

**Creative Direction:**
- Model's Gender: ${details.gender}
- Model's Pose: ${pose === 'Random' ? 'a natural and relaxed pose, interacting with the product if appropriate' : pose}
- Product: ${productInstruction}
- Background/Vibe: ${vibe}
- Artistic Style: ${style === 'Random' ? 'photorealistic' : style}
- Lighting: ${lighting === 'Random' ? 'flattering and natural-looking lighting' : lighting}
- Camera Shot: ${camera === 'Random' ? 'a dynamic angle' : camera}
- Composition: ${composition === 'Random' ? 'well-composed' : composition}
- Lens Type: ${lensType === 'Random' ? 'standard lens' : lensType}
- Film Simulation: ${filmSim === 'Random' ? 'modern digital look' : filmSim}
- AI Creativity Level (0-10): ${creativityLevel}

**Final Requirements:**
- The result must be a high-quality, authentic-looking, and engaging image for affiliate marketing.
- CRITICAL: The image must be purely visual. Do NOT add text, watermarks, or logos.
`;
  }
};

// --- Background Remover ---
export const getBackgroundRemovalPrompt = (): string => {
    return "Remove the background from the provided image. The output should be a clean PNG with a transparent background. Isolate the main subject perfectly.";
};

// --- Image Enhancer ---
export const getImageEnhancementPrompt = (type: 'upscale' | 'colors'): string => {
    if (type === 'upscale') {
        return "Enhance the quality of the following image. Increase its resolution, sharpen the details, and reduce any noise or artifacts. The final image should look like a high-resolution, professional photograph. Do not change the content.";
    }
    // type === 'colors'
    return "Enhance the colors of the following image. Make them more vibrant, improve the contrast, and adjust the color balance to be more appealing. Do not change the content or resolution, just make the colors pop in a natural way.";
};

// --- Image Generation (Editing Mode) ---
export const getImageEditingPrompt = (userPrompt: string): string => `
You are an expert AI image editor. Your task is to modify the provided reference image(s) based on the user's request.

**User's Request:**
"${userPrompt}"

**CRITICAL GUIDELINES:**
1.  **Face Fidelity:** If a reference image contains a person, it is absolutely critical that the person's face in the final image is a **photorealistic and exact match** to the face from the reference image. Do NOT alter their facial features, structure, or identity. The final image must look like the same person.
2.  **Apply Edits:** Creatively apply the user's request to the image.
3.  **High Quality:** The final result must be a high-quality, photorealistic image.
4.  **No Text/Logos:** The final image must be purely visual. Do NOT add any text, watermarks, or logos.

Generate only the edited image based on these instructions.
`;

// --- Staff Monoklix ---
export const getStaffMonoklixPrompt = (details: {
  agentId: string;
  userInput: string;
  language: string;
}): string => {
    const baseInstruction = `You are a helpful AI assistant. Your final output language must be strictly in ${details.language}.`;
    let agentSpecificInstruction = '';

    switch (details.agentId) {
        case 'wan':
            agentSpecificInstruction = `You are Wan, an expert in market research. Based on the product/service "${details.userInput}", create a detailed "Ideal Customer Persona". Include demographics, interests, pain points, and motivations.`;
            break;
        case 'tina':
            agentSpecificInstruction = `You are Tina, a behavioral psychology expert. For the product/service "${details.userInput}", identify the key "Fears" (what the customer wants to avoid) and "Desires" (what the customer wants to achieve).`;
            break;
        case 'jamil':
            agentSpecificInstruction = `You are Jamil, a marketing strategist. For the product/service "${details.userInput}", brainstorm 3 distinct "Marketing Angles". Each angle should present a unique way to appeal to potential customers.`;
            break;
        case 'najwa':
            agentSpecificInstruction = `You are Najwa, a professional copywriter. Write a short, persuasive marketing copy for the product/service "${details.userInput}". Focus on benefits over features.`;
            break;
        case 'saifuz':
            agentSpecificInstruction = `You are Saifuz, an A/B testing specialist. Take the following sales copy and create 3 different variations of it. Each variation should try a different hook or call-to-action. Original copy: "${details.userInput}"`;
            break;
        case 'mieya':
            agentSpecificInstruction = `You are Mieya, an expert in classic marketing formulas. Write a marketing copy for the product/service "${details.userInput}" using the AIDA (Attention, Interest, Desire, Action) formula.`;
            break;
        case 'afiq':
            agentSpecificInstruction = `You are Afiq, a web content strategist. Outline the key sections for a high-converting sales page for the product/service "${details.userInput}". Include sections like Headline, Problem, Solution, Testimonials, Offer, and Call to Action.`;
            break;
        case 'julia':
            agentSpecificInstruction = `You are Julia, a headline specialist. Brainstorm 10 catchy and click-worthy headlines for an advertisement about "${details.userInput}".`;
            break;
        case 'mazrul':
            agentSpecificInstruction = `You are Mazrul, a video scriptwriter. Write a short (30-60 seconds) video script for a social media ad about "${details.userInput}". Include visual cues and voiceover text.`;
            break;
        case 'musa':
            agentSpecificInstruction = `You are Musa, a personal branding coach. Based on the input "${details.userInput}", write a compelling personal branding post suitable for the specified platform. Focus on storytelling and providing value.`;
            break;
        case 'joe_davinci':
            agentSpecificInstruction = `You are Joe, an AI art prompt engineer. Based on the input "${details.userInput}", create a detailed and effective prompt for an AI image generator to create a stunning visual. Include details about style, lighting, composition, and subject.`;
            break;
        case 'zaki':
            agentSpecificInstruction = `You are Zaki, a graphic design prompter. Based on the input "${details.userInput}", create a detailed prompt for an AI to generate a promotional poster. Include instructions on text, layout, color scheme, and overall mood.`;
            break;
        default:
            agentSpecificInstruction = `Analyze the following user input and provide a helpful response: "${details.userInput}"`;
            break;
    }

    return `${baseInstruction}\n\n${agentSpecificInstruction}`;
};

// --- Social Post Studio AI Writer ---
export const getSocialPostStudioCaptionPrompt = (details: {
  agentId: string;
  userInput: string;
  language: string;
}): string => {
    let agentPersona = '';
    switch (details.agentId) {
        case 'najwa':
            agentPersona = 'You are Najwa, a professional copywriter. Focus on benefits over features.';
            break;
        case 'julia':
            agentPersona = 'You are Julia, a headline specialist. Your caption should be extra catchy and click-worthy, like a great headline expanded into a post.';
            break;
        case 'musa':
            agentPersona = 'You are Musa, a personal branding coach. Your caption should focus on storytelling and providing value, in a personal branding style.';
            break;
    }

    return `
You are an expert social media manager and copywriter.
${agentPersona}
Your final output language must be strictly in ${details.language}.

**Topic/Description from User:**
"${details.userInput}"

**Your Task:**
Generate a valid JSON object with three keys:
1.  "caption": A compelling and engaging caption for the social media post, following your persona's style. It should be well-structured and may use emojis. **CRITICAL: The caption text MUST be between 400 and 450 characters long.**
2.  "hashtags": A string of relevant hashtags, separated by spaces (e.g., "#tag1 #tag2 #tag3").
3.  "cta": A short, clear, and strong call-to-action (CTA) phrase related to the post (maximum 5 words).

**Example Output Format:**
{
  "caption": "Your generated caption text (400-450 characters) goes here...",
  "hashtags": "#socialmedia #marketing #aipowered",
  "cta": "Your short CTA here"
}

**CRITICAL:** Only output the raw JSON object. Do not include any other text, explanations, or markdown formatting like \`\`\`json. The JSON must be valid.
`;
};
