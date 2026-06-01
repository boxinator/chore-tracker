import { useEffect, useMemo, useState } from "react";
import {
  fetchAvatarManifest,
  formatAvatarStyle,
  type AvatarManifest
} from "../avatarOptions";
import { Avatar } from "./Avatar";

type AvatarPickerProps = {
  selectedAvatarKey: string | null;
  disabled?: boolean;
  label: string;
  onSelect: (avatarKey: string) => void;
};

export function AvatarPicker({
  selectedAvatarKey,
  disabled = false,
  label,
  onSelect
}: AvatarPickerProps) {
  const [avatarOptions, setAvatarOptions] = useState<AvatarManifest>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchAvatarManifest()
      .then((options) => {
        if (isMounted) {
          setAvatarOptions(options);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Avatar manifest failed to load");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const groupedOptions = useMemo(() => {
    return avatarOptions.reduce<Array<{ style: string; options: AvatarManifest }>>((groups, option) => {
      const existing = groups.find((group) => group.style === option.style);

      if (existing) {
        existing.options.push(option);
      } else {
        groups.push({ style: option.style, options: [option] });
      }

      return groups;
    }, []);
  }, [avatarOptions]);

  if (loading) {
    return <p className="avatar-picker-status">Loading avatars...</p>;
  }

  if (error) {
    return <p className="form-error">{error}</p>;
  }

  return (
    <div className="avatar-picker" aria-label={label}>
      {groupedOptions.map((group) => (
        <section className="avatar-style-group" key={group.style} aria-label={formatAvatarStyle(group.style)}>
          <h3>{formatAvatarStyle(group.style)}</h3>
          <div className="avatar-style-grid">
            {group.options.map((option) => {
              return (
                <button
                  key={option.id}
                  className={`avatar-choice${selectedAvatarKey === option.id ? " is-selected" : ""}`}
                  type="button"
                  aria-label={`Use ${option.id} avatar`}
                  disabled={disabled}
                  onClick={() => onSelect(option.id)}
                >
                  <Avatar avatarKey={option.id} name={option.id} size="lg" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
