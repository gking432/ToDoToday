import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/hooks/useStore'
import { ThemeProvider } from '@/hooks/useTheme'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const basePath = process.env.NODE_ENV === 'production' ? '/ToDoToday' : ''

export const metadata: Metadata = {
  title: 'ToDoToday',
  description: 'A personal productivity app — tasks, calendar, and notes',
  manifest: `${basePath}/manifest.json`,
  icons: {
    icon: `${basePath}/favicon.svg`,
    apple: `${basePath}/icon.svg`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ToDoToday',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#006747',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
