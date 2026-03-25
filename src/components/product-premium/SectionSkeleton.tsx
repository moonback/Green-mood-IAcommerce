export default function SectionSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-8">
        <div className="h-6 w-1/3 rounded bg-[color:var(--color-bg-muted)]" />
        <div className="h-4 w-2/3 rounded bg-[color:var(--color-bg-muted)]" />
        <div className="h-4 w-1/2 rounded bg-[color:var(--color-bg-muted)]" />
      </div>
    </div>
  );
}