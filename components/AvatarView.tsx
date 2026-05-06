import { initials } from "@/lib/avatar";

function fallbackGradient(name: string, color?: string | null) {
  if (color) return `linear-gradient(135deg, ${color}, #7c3aed)`;
  const gradients = [
    "linear-gradient(135deg, #2563eb, #14b8a6)",
    "linear-gradient(135deg, #7c3aed, #ec4899)",
    "linear-gradient(135deg, #f97316, #facc15)",
    "linear-gradient(135deg, #0891b2, #22c55e)",
    "linear-gradient(135deg, #6c63ff, #38bdf8)"
  ];
  const code = (name || "user").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return gradients[code % gradients.length];
}

export function AvatarView({
  name,
  color,
  image,
  className = "avatar"
}: {
  name: string;
  color?: string | null;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return <span className={className} style={{ backgroundImage: `url(${image})` }} aria-label={`${name} profile picture`} />;
  }
  return (
    <span className={`${className} avatarVector`} style={{ background: fallbackGradient(name, color) }} aria-label={`${name} avatar`}>
      <span className="avatarVectorShape one" aria-hidden="true" />
      <span className="avatarVectorShape two" aria-hidden="true" />
      <span className="avatarInitials">{initials(name)}</span>
    </span>
  );
}
