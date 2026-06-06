import './globals.css';

export const metadata = {
  title: 'KanalPro',
  description: 'Verwaltung fuer Rohr- und Kanalservice-Betriebe.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
