import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

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
        <div id="custom-cursor" className="custom-cursor"></div>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            const cursor = document.getElementById('custom-cursor');
            document.addEventListener('mousemove', (e) => {
              cursor.style.left = e.clientX + 'px';
              cursor.style.top = e.clientY + 'px';
            });
            document.querySelectorAll('a, button').forEach(el => {
              el.addEventListener('mouseenter', () => cursor.classList.add('active'));
              el.addEventListener('mouseleave', () => cursor.classList.remove('active'));
            });
          `
        }} />
      </body>
    </html>
  )
}
