import { initials } from "@/lib/avatar";

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
  return <span className={className} style={{ background: color || "#2563eb" }}>{initials(name)}</span>;
}
