
import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from '../common/ChatInterface';
import { ChatIcon } from '../Icons';
import { getSupportPrompt } from '../../services/promptManager';
import { type Language } from '../../types';
import { createChatSession, streamChatResponse } from '../../services/geminiService';
import { type Chat } from "@google/genai";

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface AiSupportViewProps {
  language: Language;
}

const AiSupportView: React.FC<AiSupportViewProps> = ({ language }) => {
  const systemInstruction = getSupportPrompt();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const initializedRef = useRef(false);

  // Initialize Chat Session
  useEffect(() => {
      const initSession = async () => {
          if (initializedRef.current) return;
          initializedRef.current = true;
          try {
              const chat = await createChatSession(systemInstruction);
              setChatSession(chat);
          } catch (e) {
              console.error("Failed to initialize AI Support chat:", e);
              // Fallback or retry logic could go here
          }
      };
      initSession();
  }, [systemInstruction]);

  const onSendMessage = async (prompt: string) => {
    if (!chatSession) {
        console.error("Chat session not initialized");
        return;
    }

    // Add user message immediately
    const userMessage: Message = { role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
        // Add placeholder for AI response
        setMessages(prev => [...prev, { role: 'model', text: '' }]);
        
        let fullResponse = "";
        const stream = await streamChatResponse(chatSession, prompt);
        
        for await (const chunk of stream) {
            const chunkText = chunk.text; // Assuming @google/genai syntax based on instructions
            if (chunkText) {
                fullResponse += chunkText;
                setMessages(prev => {
                    const newHistory = [...prev];
                    const lastIndex = newHistory.length - 1;
                    if (newHistory[lastIndex].role === 'model') {
                        newHistory[lastIndex] = { ...newHistory[lastIndex], text: fullResponse };
                    }
                    return newHistory;
                });
            }
        }
    } catch (e) {
        console.error("Chat error:", e);
        setMessages(prev => [...prev, { role: 'model', text: "Maaf, saya menghadapi masalah teknikal. Sila cuba lagi sebentar lagi." }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-3">
          <ChatIcon className="w-8 h-8 text-primary-500"/>
          AI Support Assistant
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Get instant help and answers about using the platform.</p>
      </div>
       {/* This wrapper ensures the ChatInterface correctly fills the remaining vertical space */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface
          systemInstruction={systemInstruction}
          placeholder='Ask a question, e.g., "How do I create a video?"'
          messages={messages}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          language={language}
        />
      </div>
    </div>
  );
};

export default AiSupportView;
