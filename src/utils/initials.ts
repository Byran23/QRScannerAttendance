/**
 * Get initials from a full name.
 * "Alice Johnson" → "AJ"
 * "Bob" → "B"
 * "Carol Ann Davis" → "CD" (first + last)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic color based on name string, using blue/orange/teal/sky/amber palette.
 */
const BG_COLORS = [
  'bg-blue-600',
  'bg-sky-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-blue-500',
  'bg-orange-500',
];

export function getInitialsBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}
