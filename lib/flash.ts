export type FlashTone = "success" | "error";

export function buildFlashPath(pathname: string, tone: FlashTone, message: string) {
  const params = new URLSearchParams();
  params.set("flashTone", tone);
  params.set("flashMessage", message);
  return `${pathname}?${params.toString()}`;
}

