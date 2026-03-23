import type { FlashTone } from "@/lib/flash";

export function FlashBanner({
  message,
  tone,
}: Readonly<{
  message: string;
  tone: FlashTone;
}>) {
  const className = tone === "success" ? "flash-banner success" : "flash-banner error";

  return <div className={className}>{message}</div>;
}

