
import eventBus from './eventBus';

/**
 * Handles API errors by identifying the error type, triggering auto-repair mechanisms,
 * and returning a translation key for a user-friendly error string.
 * @param {unknown} error - The error caught from the API call.
 * @returns {string} A translation key for the error message.
 */
export const handleApiError = (error: unknown): string => {
    let message: string;
    if (error instanceof Error) {
        message = error.message;
    } else {
        message = String(error);
    }
    
    const lowerCaseMessage = message.toLowerCase();

    // A more specific check for definitive authentication failures to avoid false positives.
    const isDefinitiveAuthFailure = 
        lowerCaseMessage.includes('api key not valid') ||
        lowerCaseMessage.includes('api key not found') ||
        lowerCaseMessage.includes('invalid authentication credentials') || // For expired __SESSION tokens
        lowerCaseMessage.includes('request had invalid authentication credentials') ||
        lowerCaseMessage.includes('failed to verify the api key') ||
        lowerCaseMessage.includes('resource exhausted') ||
        lowerCaseMessage.includes('quota exceeded');

    if (isDefinitiveAuthFailure) {
        eventBus.dispatch('personalTokenFailed');
        return 'tokenInvalid';
    }
    
    // Check for safety/400 errors to reduce log noise
    const isSafetyOrBadRequest = message.includes('[400]') || lowerCaseMessage.includes('safety') || lowerCaseMessage.includes('blocked');

    if (!isSafetyOrBadRequest) {
        console.error("Original API Error:", error);
    } else {
        console.warn("API Warning (400/Safety):", message);
    }
    
    let errorCode: string | undefined;

    // --- Start Error Code Detection ---
    
    // 1. Prioritize specific keywords that map directly to our desired user messages.
    if (lowerCaseMessage.includes('bad request') && (lowerCaseMessage.includes('safety') || lowerCaseMessage.includes('filter'))) {
        errorCode = '400_SAFETY'; // Specifically a safety filter error
    } else if (lowerCaseMessage.includes('failed to fetch') || lowerCaseMessage.includes('load failed')) {
        errorCode = 'NET_RETRY';
    } else if (message.includes('[400]')) {
        errorCode = '400';
    }


    // 2. If a specific code wasn't found via keywords, proceed with generic parsing.
    if (!errorCode) {
        try {
            const jsonMatch = message.match(/(\{.*\})/s);
            if (jsonMatch && jsonMatch[0]) {
                const errorObj = JSON.parse(jsonMatch[0]);
                if (errorObj?.error?.code) {
                    errorCode = String(errorObj.error.code);
                }
            }
        } catch (e) { /* ignore json parsing errors */ }

        if (!errorCode) {
            const codeMatch = message.match(/\[(\d{3})\]|\b(\d{3})\b/);
            if (codeMatch) {
                errorCode = codeMatch[1] || codeMatch[2];
            }
        }

        if (!errorCode) {
            if (lowerCaseMessage.includes('permission denied')) {
                errorCode = '403';
            } else if (lowerCaseMessage.includes('bad request')) {
                errorCode = '400';
            } else if (lowerCaseMessage.includes('server error') || lowerCaseMessage.includes('503')) {
                errorCode = '500';
            }
        }
    }
    // --- End Error Code Detection ---

    switch(errorCode) {
        case '400_SAFETY': return 'safetyBlock - Check Console';
        case '400': return 'badRequest - Check Console';
        case '403':
        case '401': return 'permissionDenied - Check Console';
        case '500': return 'serverError - Check Console';
        case '503': return 'GoogleUnavailable - Check Console';
        case 'NET_RETRY': return 'networkErrorRetryFailed - Check Console';
        default: {
            const firstLine = message.split('\n')[0];

            if (firstLine.length > 150 || firstLine.includes('[GoogleGenerativeAI Error]')) {
                return 'unexpectedError';
            }
            
            return firstLine; // Return the raw message if it's short and simple
        }
    }
};
