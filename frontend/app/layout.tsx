import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import CustomCursor from '../components/CustomCursor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Affective Music SaaS Platform',
  description: 'Music Emotion Recognition and Biofeedback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <CustomCursor />
        {children}
      </body>
    </html>
  )
}

