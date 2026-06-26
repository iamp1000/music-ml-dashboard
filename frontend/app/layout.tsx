import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'


const inter = Inter({ subsets: ['latin'] })

import type { Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Luna | AI Music Analytics & Discovery',
  description: 'Connect your Spotify to unlock advanced machine learning analytics, emotional telemetry, and AI-driven music discovery in a stunning 3D vector space.',
  keywords: ['Spotify', 'Music Analytics', 'AI Music Discovery', 'Machine Learning', 'Audio Telemetry', 'Spotify Stats'],
  authors: [{ name: 'Luna Team' }],
  openGraph: {
    title: 'Luna | AI Music Analytics & Discovery',
    description: 'Connect your Spotify to unlock advanced machine learning analytics, emotional telemetry, and AI-driven music discovery.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Luna Music ML',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luna | AI Music Analytics & Discovery',
    description: 'Unlock advanced machine learning analytics for your Spotify history.',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}

