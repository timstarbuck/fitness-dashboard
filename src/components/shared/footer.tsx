// "use cache" so the year is prerendered at build time instead of failing static rendering.
async function currentYear() {
  "use cache";
  return new Date().getFullYear();
}

export async function Footer() {
  const year = await currentYear();

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex w-full max-w-6xl px-6 py-4 text-sm text-muted-foreground sm:flex-row">
        <p className="ml-auto">© {year} Tim Starbuck · Personal health &amp; fitness dashboard</p>
      </div>
    </footer>
  );
}
