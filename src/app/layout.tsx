import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-provider'
import { NotificationProvider } from '@/lib/notification-provider'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShipSensei - AI Mentor for Shipping Products',
  description:
    'From idea to launched product in 30 minutes. AI-powered mentorship for complete beginners.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
