
// This service has been deprecated and its functionality removed.
// All functions are now no-ops to satisfy existing imports until fully refactored.

export type WebhookPayload = {
    type: 'text' | 'image' | 'video' | 'audio';
    prompt: string;
    result: string;
    mimeType?: string;
    timestamp: number;
    userId: string;
};

export const triggerUserWebhook = async (
    data: any
) => {
    // No-op
    return Promise.resolve();
};

export const triggerErrorWebhook = (error: unknown) => {
    // No-op
};

export const sendTestUserWebhook = async (): Promise<{ success: boolean; message: string }> => {
    return Promise.resolve({ success: false, message: "Webhook functionality has been disabled." });
};

export const sendSocialPostToWebhook = async (
    caption: string,
    hashtags: string,
    cta: string,
    link: string,
    scheduleDate: string,
    mediaItems: any[]
): Promise<{ success: boolean; message: string }> => {
    return Promise.resolve({ success: false, message: "Social Post Webhook is disabled." });
};
