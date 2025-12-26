/**
 * Centralized configuration for AI models.
 * This separates model names from the application logic, making it easier
 * to update or swap models in the future without changing service code.
 */
export const MODELS = {
  text: 'gemini-2.5-flash',
  imageGeneration: 'imagen-4.0-generate-001',
  imageEdit: 'IMAGEN_RECIPE', // Represents all Imagen V3 recipe-based edits
  videoGenerationDefault: 'veo-3.1-fast-generate-001',
  videoGenerationOptions: [
    { id: 'veo-3.1-fast-generate-001', label: 'Veo 3 (Fast)' },
    { id: 'veo-3.1-generate-001', label: 'Veo 3 (Standard)' },
  ],
};
