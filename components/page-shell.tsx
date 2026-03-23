export function PageShell({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 1 workspace</p>
          <h2>{title}</h2>
        </div>
        <p className="page-description">{description}</p>
      </header>
      {children}
    </section>
  );
}

