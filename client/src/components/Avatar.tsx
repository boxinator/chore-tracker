import { defaultAvatarKey, getAvatarImageSrc } from "../avatarOptions";

type AvatarProps = {
  avatarKey: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
};

export function Avatar({ avatarKey, name, size = "md", interactive = false }: AvatarProps) {
  const imageSrc = getAvatarImageSrc(avatarKey) ?? getAvatarImageSrc(defaultAvatarKey);
  const className = [
    "avatar",
    `avatar-${size}`,
    interactive ? "is-interactive" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} aria-label={`${name} avatar`} title={name}>
      <img className="avatar-image" src={imageSrc} alt="" aria-hidden="true" loading="lazy" />
    </span>
  );
}
