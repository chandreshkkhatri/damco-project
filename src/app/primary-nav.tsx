import Link from "next/link";

export function PrimaryNav() {
  return (
    <nav className="page-nav" aria-label="Primary navigation">
      <Link href="/">Today</Link>
      <Link href="/weekly">Weekly</Link>
      <Link href="/notes">Notes</Link>
      <Link href="/tasks">Tasks</Link>
      <Link href="/assist">Assist</Link>
    </nav>
  );
}
