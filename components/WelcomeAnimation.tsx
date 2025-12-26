import React, { useEffect } from 'react';
import { LogoIcon } from './Icons';
import { getTranslations } from '../services/translations';

interface WelcomeAnimationProps {
  onAnimationEnd: () => void;
}

const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ onAnimationEnd }) => {
  const T = getTranslations().welcomeAnimation;
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 2000); // Must match animation duration

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <div className="text-center animate-zoomIn">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-4 sm:text-4xl">
            {T.welcome}
        </h1>
        <LogoIcon className="w-64 mx-auto text-neutral-800 dark:text-neutral-200" />
      </div>
    </div>
  );
};

export default WelcomeAnimation;