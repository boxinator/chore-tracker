export type AvatarOption = {
  id: string;
  style: string;
  genderOption?: string;
  seed: string;
  src: string;
  sourceUrl?: string;
};

export type AvatarManifest = AvatarOption[];

export const avatarManifestUrl = "/avatars/manifest.json";

export const defaultAvatarKey = "adventurer-01";

export function getAvatarImageSrc(avatarKey: string | null | undefined) {
  if (!avatarKey) {
    return null;
  }

  return `/avatars/${avatarKey}.svg`;
}

export function formatAvatarStyle(style: string) {
  return style
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function fetchAvatarManifest(): Promise<AvatarManifest> {
  const response = await fetch(avatarManifestUrl);

  if (!response.ok) {
    throw new Error(`Avatar manifest failed with ${response.status}`);
  }

  const payload = (await response.json()) as AvatarManifest;

  return payload.filter((option) => option.id && option.style && option.src);
}
