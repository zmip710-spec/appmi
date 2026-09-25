import React from 'react';

interface UserAvatarProps {
  name?: string;
  size?: string;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'Usuario',
  size = 'w-10 h-10 text-sm',
  className = ''
}) => {
  const getInitials = (str: string) => {
    if (!str || !str.trim()) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black flex items-center justify-center border-2 border-blue-400/40 shadow shrink-0 select-none ${size} ${className}`}>
      {getInitials(name)}
    </div>
  );
};
