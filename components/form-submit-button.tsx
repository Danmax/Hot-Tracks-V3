"use client";

import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  className,
  confirmMessage,
  disabled,
  idleLabel,
  pendingLabel,
  submitName,
  submitValue,
}: Readonly<{
  className?: string;
  confirmMessage?: string;
  disabled?: boolean;
  idleLabel: string;
  pendingLabel?: string;
  submitName?: string;
  submitValue?: string;
}>) {
  const { pending } = useFormStatus();
  const isDisabled = pending || Boolean(disabled);

  return (
    <button
      className={className}
      disabled={isDisabled}
      name={submitName}
      onClick={(event) => {
        if (isDisabled || !confirmMessage) {
          return;
        }

        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
      value={submitValue}
    >
      {pending ? pendingLabel ?? "Saving..." : idleLabel}
    </button>
  );
}
