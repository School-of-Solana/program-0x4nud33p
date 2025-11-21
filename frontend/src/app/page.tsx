import MakeEscrowForm from '@/components/MakeEscrowForm'
import TakeEscrowForm from '@/components/TakeEscrowForm'
import RefundEscrowForm from '@/components/RefundEscrowForm'

export default function EscrowPage() {
  return (
    <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
      <MakeEscrowForm />
      <TakeEscrowForm />
      <RefundEscrowForm />
    </main>
  )
}
