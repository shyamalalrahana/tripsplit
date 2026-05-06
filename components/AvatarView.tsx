import { initials } from "@/lib/avatar";

function avatarAccent(name: string, color?: string | null) {
  if (color) return color;
  const colors = ["#2563eb", "#6c63ff", "#0891b2", "#7c3aed", "#0f6bff"];
  const code = (name || "user").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[code % colors.length];
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
  const accent = avatarAccent(name, color);
  return (
    <span className={`${className} avatarVector`} style={{ ["--avatar-accent" as string]: accent }} aria-label={`${name} avatar`}>
      <svg className="avatarIllustration" viewBox="0 0 96 96" aria-hidden="true">
        <path className="avatarCapFill" d="M31 34c5-18 21-25 39-18 10 4 16 13 17 25-12 5-32 5-48-2l-29 4c1-7 8-11 21-9Z" />
        <path className="avatarLine" d="M30 34c5-18 21-25 39-18 10 4 16 13 17 25" />
        <path className="avatarLine avatarCap" d="M10 43c1-8 9-12 22-9 18 3 32 4 47 0 4-1 7 0 8 4-18 8-37 7-55 1l-22 4Z" />
        <path className="avatarLine" d="M44 41c-3 6-4 12-2 18 2 8 10 11 17 7" />
        <path className="avatarLine" d="M59 42c8-1 15 4 15 12 0 7-5 12-12 13" />
        <path className="avatarLine" d="M61 51c2-1 4 0 5 2" />
        <path className="avatarLine" d="M34 47c-4 3-8 3-12 1" />
        <path className="avatarLine" d="M31 52c-2 4-5 7-8 10" />
        <path className="avatarLine" d="M40 71c-10 2-17 8-21 19" />
        <path className="avatarLine" d="M61 69c11 3 19 10 24 21" />
        <path className="avatarLine" d="M42 78c8 5 17 5 25 0" />
      </svg>
      <span className="avatarInitials" aria-hidden="true">{initials(name)}</span>
    </span>
  );
}
