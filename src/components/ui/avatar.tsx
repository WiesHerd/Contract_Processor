import React from 'react';

interface AvatarProps {
  initial: string;
  onClick?: () => void;
  title?: string;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ initial, onClick, title, className }) => (
  <div
    className={[
      "w-10 h-10 rounded-full border-2 border-blue-500 shadow-md bg-gradient-to-tr from-blue-100 to-blue-300 flex items-center justify-center overflow-hidden flex-shrink-0",
      className
    ].filter(Boolean).join(' ')}
    style={{ 
      aspectRatio: '1 / 1',
      minWidth: '2.5rem',
      minHeight: '2.5rem',
      maxWidth: '2.5rem',
      maxHeight: '2.5rem'
    }}
    onClick={onClick}
    title={title || 'Account'}
  >
    <span className="text-blue-700 font-bold text-lg select-none">{initial}</span>
  </div>
);

export default Avatar;
