import { useEffect, useMemo, useState } from "react";
import fallbackEarth from "../assets/earth-blue-marble.jpg";

type EpicImage = {
  image: string;
  date: string;
  caption?: string;
};

function getEpicImageUrl(item: EpicImage) {
  const [datePart] = item.date.split(" ");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day || !item.image) {
    return null;
  }

  return `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/jpg/${item.image}.jpg`;
}

function getLatestEpicImage(items: EpicImage[]) {
  return [...items].sort((left, right) => left.date.localeCompare(right.date)).at(-1) ?? null;
}

export function SpaceBackground() {
  const [epicImage, setEpicImage] = useState<EpicImage | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLatestEarth() {
      try {
        const response = await fetch("https://epic.gsfc.nasa.gov/api/natural", {
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as EpicImage[];
        setEpicImage(getLatestEpicImage(payload));
      } catch {
        if (!controller.signal.aborted) {
          setEpicImage(null);
        }
      }
    }

    void fetchLatestEarth();

    return () => controller.abort();
  }, []);

  const earthImage = useMemo(() => {
    const epicUrl = epicImage ? getEpicImageUrl(epicImage) : null;
    return epicUrl ?? fallbackEarth;
  }, [epicImage]);

  return (
    <div
      className="space-background space-background--epic"
      aria-hidden="true"
      style={{ ["--earth-image" as string]: `url(${earthImage})` }}
    />
  );
}
