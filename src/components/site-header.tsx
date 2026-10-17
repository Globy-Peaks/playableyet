import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="size-2 rounded-full bg-primary-foreground" />
          </span>
          <span className="text-base font-semibold tracking-tight">PlayableYet</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Games
          </Link>
          <Link href="/ps3" className="hover:text-foreground">
            PS3
          </Link>
          <Link href="/ps4" className="hover:text-foreground">
            PS4
          </Link>
          <Link href="/ps5" className="hover:text-foreground">
            PS5
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
