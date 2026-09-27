import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

const CHUNK_RELOAD_KEY = "flyup:chunk-reload";

const isChunkLoadError = (error: Error) =>
  /chunkloaderror|loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
    error.message,
  );

class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);

    if (isChunkLoadError(error) && sessionStorage.getItem(CHUNK_RELOAD_KEY) !== window.location.href) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, window.location.href);
      window.location.reload();
    }
  }

  private retry = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 font-kanit">
        <section className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-foreground">ไม่สามารถแสดงหน้านี้ได้</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            อาจเกิดจากไฟล์หน้าเว็บเพิ่งอัปเดตหรือการเชื่อมต่อขัดข้อง กรุณาลองโหลดหน้าอีกครั้ง
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            โหลดหน้าอีกครั้ง
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
