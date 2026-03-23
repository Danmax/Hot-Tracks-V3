"use client";

import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  className,
  confirmMessage,
  idleLabel,
  pendingLabel,
}: Readonly<{
  className?: string;
  confirmMessage?: string;
  idleLabel: string;
  pendingLabel?: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (pending || !confirmMessage) {
          return;
        }

        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? pendingLabel ?? "Saving..." : idleLabel}
    </button>
  );
}
