'use client'
import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { refundEscrow as refundEscrowAction } from '@/lib/escrowActions'
import { toast } from 'sonner'

export default function RefundEscrowForm() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const [seed, setSeed] = useState<string>('')
  const [mintA, setMintA] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const isConnected = Boolean(wallet.publicKey)

  const validate = () => {
    if (!isConnected) return toast.error('Connect wallet')
    if (!seed || Number.isNaN(Number(seed))) return toast.error('Seed must be numeric')
    try {
      new PublicKey(mintA)
    } catch {
      return toast.error('Mint A is invalid')
    }
    return true
  }

  const handleRefund = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const seedBN = new anchor.BN(seed)
      const mintAPk = new PublicKey(mintA)

      const tx = await refundEscrowAction(wallet, connection, seedBN, mintAPk)
      toast.success(`Refund sent — tx: ${tx}`)
    } catch (e: any) {
      console.error(e)
      toast.error(String(e?.message ?? e ?? 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 border rounded-lg shadow-md bg-gray-900 text-white space-y-4">
      <h2 className="text-xl font-bold">Refund Escrow</h2>
      <p className="text-sm text-gray-400">Only the Maker can refund.</p>
      <input
        type="number"
        placeholder="Seed (u64)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />
      <input
        type="text"
        placeholder="Mint A (Token to retrieve)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={mintA}
        onChange={(e) => setMintA(e.target.value)}
      />
      <button
        onClick={handleRefund}
        disabled={loading || !isConnected}
        className="w-full p-2 bg-red-600 hover:bg-red-500 rounded disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Refund Assets'}
      </button>
    </div>
  )
}
