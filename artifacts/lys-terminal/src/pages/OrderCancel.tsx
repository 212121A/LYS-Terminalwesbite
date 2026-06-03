import { Link } from "wouter";
import { XCircle } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

export function OrderCancel() {
  const { tr } = useLang();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-end px-4 py-3 shrink-0">
        <LanguageSelector />
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pb-16">
        <div className="w-full max-w-md rounded-2xl bg-card text-card-foreground shadow-lg border border-card-border px-8 py-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
              <XCircle className="w-9 h-9 text-destructive" strokeWidth={1.75} aria-hidden />
            </div>
          </div>

          <h1 className="font-serif text-[24px] sm:text-[28px] font-semibold text-primary leading-tight mb-3">
            {tr.cancelBanner}
          </h1>

          <Link
            href="/"
            className="inline-flex items-center justify-center min-w-[200px] mt-6 px-8 py-3.5 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold tracking-tight shadow-md hover:opacity-90 active:scale-[0.98] transition-opacity"
          >
            {tr.orderCancelBackToMenu}
          </Link>
        </div>
      </main>
    </div>
  );
}
