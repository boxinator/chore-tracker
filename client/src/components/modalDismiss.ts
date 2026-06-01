import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

type BackdropClickEvent = MouseEvent<HTMLDivElement>;
type BackdropPointerEvent = PointerEvent<HTMLDivElement>;
type CloseButtonClickEvent = MouseEvent<HTMLButtonElement>;
type CloseButtonPointerEvent = PointerEvent<HTMLButtonElement>;

export function useModalDismiss(onClose: () => void) {
  const backdropPointerStart = useRef<EventTarget | null>(null);
  const closeButtonPointerStarted = useRef(false);

  return {
    backdropProps: {
      role: "presentation" as const,
      onPointerDown: (event: BackdropPointerEvent) => {
        backdropPointerStart.current = event.target;
      },
      onClick: (event: BackdropClickEvent) => {
        if (
          event.target === event.currentTarget &&
          backdropPointerStart.current === event.currentTarget
        ) {
          onClose();
        }

        backdropPointerStart.current = null;
      }
    },
    closeButtonProps: {
      onPointerDown: (_event: CloseButtonPointerEvent) => {
        closeButtonPointerStarted.current = true;
      },
      onClick: (event: CloseButtonClickEvent) => {
        if (closeButtonPointerStarted.current || event.detail === 0) {
          onClose();
        }

        closeButtonPointerStarted.current = false;
      }
    }
  };
}
