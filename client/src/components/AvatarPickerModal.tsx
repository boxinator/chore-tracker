import { X } from "lucide-react";
import { AvatarPicker } from "./AvatarPicker";
import { useModalDismiss } from "./modalDismiss";

type AvatarPickerModalProps = {
  childName: string;
  selectedAvatarKey: string | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSelect: (avatarKey: string) => void;
};

export function AvatarPickerModal({
  childName,
  selectedAvatarKey,
  saving,
  error,
  onClose,
  onSelect
}: AvatarPickerModalProps) {
  const { backdropProps, closeButtonProps } = useModalDismiss(onClose);

  return (
    <div className="modal-backdrop" {...backdropProps}>
      <section
        className="modal avatar-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="modal-eyebrow">Avatar</p>
            <h2 id="avatar-picker-title">{childName}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" {...closeButtonProps}>
            <X aria-hidden="true" />
          </button>
        </header>

        {error && <p className="form-error">{error}</p>}

        <AvatarPicker
          selectedAvatarKey={selectedAvatarKey}
          disabled={saving}
          label={`${childName} avatar choices`}
          onSelect={onSelect}
        />
      </section>
    </div>
  );
}
