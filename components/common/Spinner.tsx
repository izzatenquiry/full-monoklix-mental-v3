
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="relative h-8 w-8 mx-auto">
      {/* Outer ring */}
      <div className="absolute top-0 left-0 h-full w-full border-4 border-solid border-primary-500 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '1.2s' }}></div>
      {/* Inner ring */}
      <div className="absolute top-0 left-0 h-full w-full p-2">
        <div className="h-full w-full border-2 border-solid border-neutral-400 dark:border-neutral-600 border-b-transparent rounded-full animate-reverse-spin"></div>
      </div>
    </div>
  );
};

export default Spinner;
