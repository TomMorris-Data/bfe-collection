import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-[#3D1A6B] to-[#5B2C8D] px-6 py-3 flex items-center gap-4 no-print">
        <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center
                        text-white font-black text-sm border border-white/20 shrink-0">
          BFE
        </div>
        <div className="text-white mr-4">
          <div className="font-bold text-sm leading-none">Belmont Farm &amp; Equine Vets</div>
          <div className="text-white/60 text-xs">Farm Health Dashboard</div>
        </div>
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <Link href="/admin"
            className="text-white/80 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            Farms
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
