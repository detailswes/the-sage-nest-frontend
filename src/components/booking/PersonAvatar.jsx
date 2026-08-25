import { useState } from 'react';
import { getProfileImageUrl } from '../../utils/imageUrl';
import { expertInitials } from '../../utils/bookingDisplay';

// ─── Person avatar ────────────────────────────────────────────────────────────
// Photo-or-initials avatar. Works for an expert (profileImage set) or a
// parent/client (no profile image on the User model — falls back to initials).
const PersonAvatar = ({ name, profileImage, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const url = getProfileImageUrl(profileImage);
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-base' : 'w-11 h-11 text-sm';

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-[#445446] text-white flex items-center justify-center font-semibold flex-shrink-0 select-none`}>
      {expertInitials(name)}
    </div>
  );
};

export default PersonAvatar;
