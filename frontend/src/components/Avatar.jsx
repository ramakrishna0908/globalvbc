const SIZES = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base', lg: 'h-20 w-20 text-2xl' };

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ src, name = '', size = 'md' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${SIZES[size]}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-bg-elevated font-display font-semibold text-text-secondary ${SIZES[size]}`}
      aria-label={name}
    >
      {initials(name) || '?'}
    </div>
  );
}
