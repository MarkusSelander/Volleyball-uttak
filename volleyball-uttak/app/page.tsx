export default function Home() {
  return (
    <main className="min-h-screen gradient-primary relative overflow-hidden">
      {/* Bakgrunnsdekorasjoner */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white rounded-full animate-bounce-slow"></div>
        <div
          className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full animate-pulse-slow"
          style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-8 p-4">
        {/* Hovedinnhold */}
        <div className="text-center animate-fade-in">
          <div className="mb-6">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg">
              Volleyball
              <span className="block text-4xl md:text-5xl font-light mt-2">
                Uttak
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Administrer ditt volleyball lag på en enkel og effektiv måte
            </p>
          </div>

          {/* Funksjoner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="glass rounded-xl p-6 text-white hover-lift">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="text-lg font-semibold mb-2">
                Spilleradministrasjon
              </h3>
              <p className="text-white/80">
                Hold oversikt over alle spillere og deres posisjoner
              </p>
            </div>
            <div className="glass rounded-xl p-6 text-white hover-lift">
              <div className="text-3xl mb-3">🏐</div>
              <h3 className="text-lg font-semibold mb-2">Laguttak</h3>
              <p className="text-white/80">
                Gjør smarte uttak basert på spillerens styrker
              </p>
            </div>
            <div className="glass rounded-xl p-6 text-white hover-lift">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold mb-2">Statistikk</h3>
              <p className="text-white/80">
                Følg lagets utvikling og prestasjoner
              </p>
            </div>
          </div>
        </div>

        {/* Call-to-action */}
        <div className="animate-slide-in" style={{ animationDelay: "0.3s" }}>
          <a
            href="/login"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-600 rounded-full font-semibold text-lg hover-lift shadow-lg transition-all duration-300 hover:bg-blue-50">
            <span>Kom i gang</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-8 text-center text-white/70 text-sm">
          <p>Bygget med Next.js og Firebase</p>
        </div>
      </div>
    </main>
  );
}
