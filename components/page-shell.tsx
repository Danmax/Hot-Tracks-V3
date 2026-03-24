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
        <div className="page-title-block">
          <p className="eyebrow">Mobile race workspace</p>
          <h2>{title}</h2>
          <div className="page-tag-row">
            <span className="chip">Garage</span>
            <span className="chip">Race</span>
            <span className="chip">Championship</span>
          </div>
        </div>
        <p className="page-description">{description}</p>
      </header>
      {children}
    </section>
  );
}
