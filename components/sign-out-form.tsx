import { signOutAction } from "@/app/auth-actions";

export function SignOutForm({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <form action={signOutAction}>
      <button className="button secondary compact-button full-width" type="submit">
        {compact ? "Out" : "Sign Out"}
      </button>
    </form>
  );
}
