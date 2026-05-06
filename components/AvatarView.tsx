export function AvatarView({
  name,
  color: _color,
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
    <span
      className={`${className} avatarVector`}
      style={{ backgroundImage: "url(/default-profile-vector.png)" }}
      aria-label={`${name} avatar`}
    />
  );
}
