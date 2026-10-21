import React, { useState } from 'react';

interface ResponsavelAvatarProps {
  name: string;
  fotoUrl?: string;
  size?: number;
}

export const ResponsavelAvatar: React.FC<ResponsavelAvatarProps> = ({
  name,
  fotoUrl,
  size = 56,
}) => {
  const [hasError, setHasError] = useState(false);
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div
      className="relative rounded-full bg-[var(--bg-input)] border-2 border-[var(--primary)] shadow-[0_4px_12px_rgba(0,0,0,.3)] overflow-hidden shrink-0 flex items-center justify-center"
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%' }}
    >
      {fotoUrl && !hasError ? (
        <img
          src={fotoUrl}
          alt={name}
          width={size}
          height={size}
          loading="eager"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[var(--primary-soft)] text-[var(--primary)] font-bold text-[22px]">
          {initial}
        </div>
      )}
    </div>
  );
};

export default ResponsavelAvatar;
