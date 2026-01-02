export default function WelcomeView() {
  const navigateToHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              E-Mail bestätigt!
            </h1>
            <p className="text-gray-300 text-lg">
              Deine E-Mail wurde erfolgreich bestätigt. Dein Konto ist jetzt aktiv.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={navigateToHome}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              Zur Anwendung
            </button>
            
            <p className="text-center text-gray-400 text-sm">
              Du kannst dich jetzt mit deinen E-Mail und Passwort anmelden.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>🎀 Bereit für deine erste Farsi-Lektion</p>
        </div>
      </div>
    </div>
  );
}
