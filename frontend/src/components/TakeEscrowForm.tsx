'use client'
import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { takeEscrow as takeEscrowAction } from '@/lib/escrowActions'
import { toast } from 'sonner'

export default function TakeEscrowForm() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const [maker, setMaker] = useState<string>('')
  const [seed, setSeed] = useState<string>('')
  const [mintA, setMintA] = useState<string>('')
  const [mintB, setMintB] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const isConnected = Boolean(wallet.publicKey)

  const validate = () => {
    if (!isConnected) return toast.error('Connect wallet')
    if (!maker) return toast.error('Maker public key required')
    if (!seed || Number.isNaN(Number(seed))) return toast.error('Seed must be numeric')
    try {
      new PublicKey(maker)
      new PublicKey(mintA)
      new PublicKey(mintB)
    } catch {
      return toast.error('One or more pubkeys are invalid')
    }
    return true
  }

  const handleTake = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const seedBN = new anchor.BN(seed)
      const makerPk = new PublicKey(maker)
      const mintAPk = new PublicKey(mintA)
      const mintBPk = new PublicKey(mintB)

      const tx = await takeEscrowAction(wallet, connection, makerPk, seedBN, mintAPk, mintBPk)
      toast.success(`Offer taken — tx: ${tx}`)
    } catch (e: any) {
      console.error(e)
      toast.error(String(e?.message ?? e ?? 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 border rounded-lg shadow-md bg-gray-900 text-white space-y-4">
      <h2 className="text-xl font-bold">Take Escrow</h2>
      <input
        type="text"
        placeholder="Maker Public Key"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={maker}
        onChange={(e) => setMaker(e.target.value)}
      />
      <input
        type="number"
        placeholder="Seed (u64)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />
      <input
        type="text"
        placeholder="Mint A (Token to receive)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={mintA}
        onChange={(e) => setMintA(e.target.value)}
      />
      <input
        type="text"
        placeholder="Mint B (Token to send)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={mintB}
        onChange={(e) => setMintB(e.target.value)}
      />
      <button
        onClick={handleTake}
        disabled={loading || !isConnected}
        className="w-full p-2 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Take Offer'}
      </button>
    </div>
  )
}
