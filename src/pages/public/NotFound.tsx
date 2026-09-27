import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useSEO } from "../../hooks/useSEO";

const NotFound = () => {
  const navigate = useNavigate();

  useSEO({
    title: "404 - ไม่พบหน้าที่ต้องการ",
    description: "ไม่พบหน้าที่คุณกำลังค้นหาใน FlyUp",
  });

  return (
    <main className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-surface-soft px-4 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-border bg-white px-6 py-12 text-center shadow-sm sm:px-12">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchX size={38} strokeWidth={1.8} />
        </div>

        <p className="mt-6 text-7xl font-bold tracking-tight text-primary sm:text-8xl">404</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">ไม่พบหน้าที่ต้องการ</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          หน้านี้อาจถูกย้าย ลบ หรือ URL ไม่ถูกต้อง กรุณาตรวจสอบที่อยู่อีกครั้ง
        </p>

        <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft size={17} />
            ย้อนกลับ
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Home size={17} />
            กลับหน้าหลัก
          </Link>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
