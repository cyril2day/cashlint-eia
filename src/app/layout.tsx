import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/app/globals.scss'

export const metadata: Metadata = {
  title: 'Oil Lint | Presentation Shell',
  description: 'Presentation shell for the Oil Lint weekly analysis experience.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}