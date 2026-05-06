import { initials } from "@/lib/avatar";

function avatarAccent(name: string, color?: string | null) {
  if (color) return color;
  const colors = ["#10b981", "#14b8a6", "#22c55e", "#0ea5e9", "#6366f1"];
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
        <path className="avatarFace" d="M36 34c-7 4-10 12-10 25 0 20 12 33 30 33 15 0 26-10 30-27 6-1 10-6 10-13 0-8-6-13-14-11-11-14-29-18-46-7Z" />
        <path className="avatarHair" d="M31 46c4-16 19-24 37-21 12 2 22 10 25 23-10-7-20-10-32-8-5 6-12 9-21 9 2-4 5-7 9-11-8 0-14 3-18 8Z" />
        <path className="avatarCapFill" d="M19 37c2-17 16-27 36-27 20 0 36 12 41 34-10-5-22-7-35-5-14 2-29 1-42-2Z" />
        <path className="avatarCapBill" d="M5 41c6-12 19-17 33-11 8 3 14 8 19 15-17 3-34 2-52-4Z" />
        <path className="avatarStroke" d="M19 37c2-17 16-27 36-27 20 0 36 12 41 34" />
        <path className="avatarStroke" d="M5 41c6-12 19-17 33-11 8 3 14 8 19 15-17 3-34 2-52-4Z" />
        <path className="avatarStroke" d="M36 34c-7 4-10 12-10 25 0 20 12 33 30 33 15 0 26-10 30-27 6-1 10-6 10-13 0-8-6-13-14-11" />
        <path className="avatarStroke" d="M31 46c4-16 19-24 37-21 12 2 22 10 25 23-10-7-20-10-32-8-5 6-12 9-21 9 2-4 5-7 9-11" />
        <path className="avatarStroke avatarFaceLine" d="M39 56c4-2 8-2 12 0" />
        <path className="avatarStroke avatarFaceLine" d="M59 56c4-2 8-2 12 0" />
        <path className="avatarEye" d="M43 64c0 4 2 7 5 7s5-3 5-7-2-7-5-7-5 3-5 7Z" />
        <path className="avatarEye" d="M64 64c0 4 2 7 5 7s5-3 5-7-2-7-5-7-5 3-5 7Z" />
        <path className="avatarStroke avatarFaceLine" d="M57 67c-5 3-6 7-1 9" />
        <path className="avatarMouth" d="M61 83c0 5 4 9 9 9s9-4 9-9-4-9-9-9-9 4-9 9Z" />
        <circle className="avatarTongue" cx="70" cy="84" r="4" />
        <text className="avatarCapText" x="48" y="29" textAnchor="middle">{initials(name)}</text>
      </svg>
    </span>
  );
}
