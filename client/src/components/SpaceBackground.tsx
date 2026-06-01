import spaceOverworld from "../assets/space-overworld.png";

export function SpaceBackground() {
  return (
    <div
      className="space-background space-background--overworld"
      aria-hidden="true"
      style={{ ["--space-overworld-image" as string]: `url(${spaceOverworld})` }}
    />
  );
}
