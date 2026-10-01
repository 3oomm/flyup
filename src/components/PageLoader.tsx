export default function PageLoader() {
  return (
    <div role="status" aria-live="polite" aria-busy="true"
      className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6">
      <img src="/flyup-animation.webp" alt="" width={240} height={240}
        className="h-48 w-48 object-contain sm:h-60 sm:w-60" />
      <p className="text-sm font-medium text-muted-foreground">กำลังโหลดหน้า…</p>
    </div>
  )
}
