import './globals.css';

export const metadata = {
  title: 'SAS MAINFRAME // SYSTEM',
  description: 'Interface de gestion sécurisée',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;800&family=Libre+Barcode+128+Text&family=Share+Tech+Mono&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}