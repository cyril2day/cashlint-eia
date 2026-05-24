import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/app/globals.scss'

export const metadata: Metadata = {
  title: 'Oil Lint | Live Summary',
  description: 'Live EIA-backed weekly petroleum summary for the Oil Lint experience.'
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