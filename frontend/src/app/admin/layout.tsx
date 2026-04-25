export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-[#3D1A6B] to-[#5B2C8D] px-6 py-4 flex items-center gap-3 no-print">
        <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center
                        text-white font-black text-sm border border-white/20">
          BFE
        </div>
        <div className="text-white">
          <div className="font-bold text-sm leading-none">Belmont Farm &amp; Equine Vets</div>
          <div className="text-white/60 text-xs">Farm Health Dashboard</div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
