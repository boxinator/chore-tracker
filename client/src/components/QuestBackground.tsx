import questOverworld from "../assets/chore-quest-overworld.png";

export function QuestBackground() {
  return (
    <div
      className="quest-background"
      aria-hidden="true"
      style={{ ["--quest-overworld-image" as string]: `url(${questOverworld})` }}
    />
  );
}
