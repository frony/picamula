import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Toaster } from '@/components/ui/toaster'
import Link from 'next/link'
import Header from '@/components/header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JuntaTribo - Travel Together',
  description: 'Plan and organize your trips with friends',
}

// function Header() {
//   return (
//     <header className="bg-slate-500 py-4">
//       <div className="container mx-auto px-4">
//         <nav className="flex items-center justify-between">
//           <div className="flex items-center">
//             <Link href="/">Snowtooth Mountain</Link>
//           </div>
//           <div>
//             <Link href="/mountain">Mountain Info</Link>
//           </div>
//           <div>
//             <Link href="/hotels">Hotels</Link>
//           </div>
//           <div>
//             <Link href="/contact">Contact Us</Link>
//           </div>
//         </nav>
//       </div>
//     </header>
//   );
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
