import { StatusBar } from '@/components/patterns/StatusBar'

// Sign-in pages: no navigation, only the status bar (offline / test system)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StatusBar />
      <main id="main">{children}</main>
    </>
  )
}
