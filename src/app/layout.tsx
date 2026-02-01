import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agency OS | Feedback & Bugs & Funcionalidades',
  description: 'Reporte bugs e vote em novas funcionalidades',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
