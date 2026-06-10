export default function UserAvatar({ nickname, photoUrl, size = 32 }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={nickname}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className="flex-shrink-0"
    >
      <circle cx="18" cy="18" r="18" fill="#e8f5e9" />
      <ellipse cx="18" cy="14" rx="6" ry="6.5" fill="#639d6b" />
      <ellipse cx="18" cy="32" rx="11" ry="9" fill="#639d6b" />
    </svg>
  );
}
