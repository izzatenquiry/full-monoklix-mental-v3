import React, { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { SendIcon } from '../Icons';
import Spinner from './Spinner';
import { getTranslations } from '../../services/translations';
import { type Language } from '../../types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatInterfaceProps {
  systemInstruction: string;
  placeholder: string;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (prompt: string) => Promise<void>;
  language: Language;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ systemInstruction, placeholder, messages, isLoading, onSendMessage, language }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const T = getTranslations().common;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    setInput('');
    await onSendMessage(currentInput);
  }, [input, isLoading, onSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 p-2 sm:p-4 rounded-lg shadow-sm">
      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex-shrink-0"></div>
            )}
            <div className={`max-w-[85%] sm:max-w-md lg:max-w-lg p-3 sm:p-4 rounded-2xl shadow-sm ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-none'
            }`}>
              {/* FIX: Pass language prop */}
              <MarkdownRenderer content={msg.text} language={language} />
            </div>
             {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-700 flex-shrink-0"></div>
            )}
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex-shrink-0"></div>
            <div className="max-w-xl p-4 rounded-2xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-none flex justify-center items-center">
              <Spinner />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4 flex-shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-white dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl p-4 pr-16 resize-none focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all duration-200"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transition-transform duration-200"
            aria-label={T.sendMessage}
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;