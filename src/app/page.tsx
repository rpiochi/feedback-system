import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Central de Feedback
      </h1>
      <p className="text-lg text-gray-600 mb-12">
        Ajude-nos a melhorar! Reporte problemas ou sugira novas funcionalidades.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/bugs"
          className="block p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-red-200 transition-all"
        >
          <div className="text-4xl mb-4">🐛</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Reportar Bug
          </h2>
          <p className="text-gray-600">
            Encontrou um problema? Nos conte para que possamos resolver.
          </p>
        </Link>

        <Link
          href="/features"
          className="block p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all"
        >
          <div className="text-4xl mb-4">💡</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sugerir Funcionalidade
          </h2>
          <p className="text-gray-600">
            Tem uma ideia? Sugira e vote nas funcionalidades que deseja.
          </p>
        </Link>
      </div>
    </div>
  );
}
