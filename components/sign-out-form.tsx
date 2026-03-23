import { signOutAction } from "@/app/auth-actions";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button className="button secondary compact-button full-width" type="submit">
        Sign Out
      </button>
    </form>
  );
}

