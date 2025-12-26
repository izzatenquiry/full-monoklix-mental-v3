# MONOklix.com - All-in-One AI Platform

MONOklix.com is a comprehensive, web-based AI platform designed to streamline content creation for marketers, content creators, and entrepreneurs. Powered by Google's Gemini API, the platform provides an integrated suite of tools for generating and editing text, images, videos, and audio content.

---

## 🚀 User Flow

The application features a simplified, streamlined user flow:

1.  **External Registration & Payment:** New users register and pay on an external website (e.g., WooCommerce).
2.  **Automated Account Creation:** A webhook from the payment platform automatically creates a user account in the application's database with `lifetime` status.
3.  **Direct Email Login:** Users log in to the application using only their email address. No password is required.
4.  **Persistent Session:** The application uses `localStorage` to keep users logged in across browser sessions for a seamless experience.
5.  **Automatic API Key:** The platform automatically loads a shared, central API key for all users upon login. There is no need for users to provide or manage their own keys.

## ✨ Key Features

The application is structured into intuitive suites, each targeting a specific content creation need:

#### 📝 **AI Content Idea Suite**
- **Staff MONOklix:** A team of specialized AI agents (e.g., market researcher, copywriter, scriptwriter) that users can select to perform specific marketing and content tasks.
- **Content Ideas:** Generate trendy and engaging ideas for any topic using Google Search grounding for up-to-date results.
- **Marketing Copy:** Craft persuasive copy for social media, ads, and websites with customizable tones and languages.
- **Storyline Generator:** Automatically create a compelling 1-scene video ad concept from a product image and description.

#### 🖼️ **AI Image Suite**
- **Image Generation:** A versatile tool for creating original images from text prompts (Text-to-Image) or editing existing photos with text instructions (Image-to-Image).
- **Product Photos:** Place product images into professional, AI-generated backgrounds and settings.
- **Model Photos:** Generate realistic model photos for User-Generated Content (UGC) style marketing, combining a product image with AI. Users can optionally provide a face reference image for the AI to use.
- **Image Enhancer:** Upscale image resolution (`Upscale Quality`) and enhance colors (`Enhance Colors`) with a single click.
- **Background Remover:** Instantly remove the background from any image, providing a transparent PNG output.

#### 📹 **AI Video & Voice Suite**
- **Video Generation:** Create dynamic videos from text prompts and optional reference images, with support for multiple models and aspect ratios.
- **Video Storyboard:** A powerful 2-step tool to generate a complete 4-scene storyboard for product reviews, including both the script and AI-generated images for each scene.
- **Batch Processor:** Generate multiple videos in a single run from a list of prompts uploaded via a text file or passed from the Video Storyboard tool.
- **Video Combiner:** Merge multiple video clips from the user's gallery into a single video using client-side FFmpeg.
- **Voice Studio:** Convert text to speech with a variety of professional voice actors and settings using Google's Text-to-Speech API.

#### 🛠️ **Platform & User Features**
- **Get Started Guide:** A comprehensive, built-in guide explaining every feature of the platform.
- **e-Tutorials & Platform Status:** The default landing page for users, showing the latest platform announcements, system status, and video tutorials.
- **Gallery & History:** A centralized location for users to view, download, re-edit, or create videos from their previously generated content. All generations are saved automatically to IndexedDB.
- **Prompt Libraries:** An inspiration hub featuring a `Prompt Library` of proven use cases (fetched from an external Markdown file) and `Prompt Viral MY` for Malaysian-market-specific prompts.
- **Centralized Settings Hub:** A single, tab-based interface to manage user profiles, themes (light/dark), personal webhooks, and view API status.
- **API Health Check & Log:** Tools to verify API functionality across all services and view a detailed history of API calls.
- **AI Support Chat:** An integrated chatbot providing assistance to users.
- **Admin Dashboard:** (Admin Only) A dashboard to manage all users, update account status, and perform database backups by importing/exporting the user table as JSON.
- **Admin Content Management:** (Admin Only) An interface to update the e-Tutorials, platform status, and announcements displayed to all users.


## 🤖 AI Models & APIs Used

The platform leverages a specific set of Google's models and APIs, each chosen for its specific task:

| Service / Model Name             | Use Case                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `gemini-2.5-flash`               | All text generation, chat, and multimodal understanding. Optimized for speed with `thinkingConfig` disabled.  |
| `Imagen V3 (via proxy)`          | All image editing, composition (e.g., product/model photos), enhancement, and background removal tasks.       |
| `imagen-4.0-generate-001`        | High-quality text-to-image generation from scratch.                                                         |
| `veo-3.0-generate-001`           | State-of-the-art video generation for the highest quality.                                                  |
| `veo-3.0-fast-generate-001`      | A faster version of Veo 3 for quicker results.                                                              |
| Google Cloud Text-to-Speech      | Used in the Voice Studio for high-quality text-to-audio conversion.                                         |


## 💻 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Integration:** Google Gemini API via `@google/genai` SDK
- **Backend & User DB:** Supabase (Postgres)
- **Client-Side Storage:** IndexedDB for storing generated content (gallery), logs, and user settings.
- **Video Processing:** FFmpeg.wasm (loaded via CDN for client-side video combining)
- **Build Tool:** Vite

## 📂 Project Structure

The project is organized into a clean and maintainable structure:

```
/
├── components/
│   ├── common/         # Reusable components (Spinner, Tabs, Modals, etc.)
│   ├── views/          # High-level components for each feature/page
│   ├── ApiKeyStatus.tsx  # Header icon for API status
│   ├── Icons.tsx       # SVG icon components
│   └── Sidebar.tsx     # Main navigation sidebar
├── services/           # Business logic, API calls, and storage interactions
│   ├── geminiService.ts  # All calls to the Google Gemini & TTS APIs
│   ├── userService.ts    # User auth, profile management (Supabase)
│   ├── indexedDBService.ts # Low-level IndexedDB operations
│   └── ...             # Other services for logs, webhooks, prompts, etc.
├── App.tsx             # Main application component, handles routing and state
├── LoginPage.tsx       # User login component
├── types.ts            # Global TypeScript type definitions
├── index.html          # The single HTML entry point
└── index.tsx           # The root React render entry point
```