import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/app/globals.scss';

export const metadata: Metadata = {
  title: 'Oil Lint',
  description: 'Project foundation for the Oil Lint application.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}