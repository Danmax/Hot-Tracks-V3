import { AppChrome } from "@/components/app-chrome";
import { formatRoleLabel, requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <AppChrome
      userEmail={user.email}
      userName={user.displayName}
      userRole={user.role}
      userRoleLabel={formatRoleLabel(user.role)}
    >
      {children}
    </AppChrome>
  );
}
