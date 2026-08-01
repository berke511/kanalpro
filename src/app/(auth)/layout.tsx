import Image from "next/image";
import Link from "next/link";
import { currentBerlinYear } from "@/lib/date";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-blue-50 via-slate-50 to-white px-4 py-12">
      <div className="w-full max-w-md animate-auth-fade-up">
        <div className="mb-10 flex flex-col items-center text-center">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="KanalPro"
              width={349}
              height={214}
              className="h-24 w-auto"
              priority
            />
          </Link>
          <p className="mt-4 text-sm font-medium text-muted">
            Die Software für moderne Rohr- und Kanalbetriebe.
          </p>
        </div>

        <div className="rounded-3xl border border-white bg-card/95 p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] backdrop-blur-sm sm:p-10">
          {children}
        </div>
      </div>

      <footer className="mt-14 flex flex-col items-center gap-3 text-xs text-muted">
        <div className="flex items-center gap-4">
          <Link href="/impressum" className="transition hover:text-foreground">
            Impressum
          </Link>
          <span className="text-border">·</span>
          <Link href="/datenschutz" className="transition hover:text-foreground">
            Datenschutz
          </Link>
        </div>
        <span>© {currentBerlinYear()} KanalPro</span>
      </footer>
    </div>
  );
}
