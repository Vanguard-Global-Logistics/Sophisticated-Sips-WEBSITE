/** Remounts on every navigation — gives each page an elegant fade-rise entrance. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
