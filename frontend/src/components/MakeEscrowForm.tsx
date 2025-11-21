'use client'
import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { makeEscrow as makeEscrowAction } from '@/lib/escrowActions'
import { toast } from 'sonner'

export default function MakeEscrowForm() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const [seed, setSeed] = useState<string>('')
  const [deposit, setDeposit] = useState<string>('')
  const [receive, setReceive] = useState<string>('')
  const [mintA, setMintA] = useState<string>('')
  const [mintB, setMintB] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const isConnected = Boolean(wallet.publicKey)

  const validateInputs = () => {
    if (!isConnected) {
      toast.error('Connect your wallet first')
      return false
    }
    if (!seed || Number.isNaN(Number(seed))) {
      toast.error('Seed must be a numeric value')
      return false
    }
    if (!deposit || Number.isNaN(Number(deposit))) {
      toast.error('Deposit must be a numeric value')
      return false
    }
    if (!receive || Number.isNaN(Number(receive))) {
      toast.error('Receive must be a numeric value')
      return false
    }
    try {
      new PublicKey(mintA)
      new PublicKey(mintB)
    } catch {
      toast.error('Mint addresses are invalid')
      return false
    }
    return true
  }

  const handleMake = async () => {
    if (!validateInputs()) return
    setLoading(true)
    try {
      const seedBN = new anchor.BN(seed)
      const depositBN = new anchor.BN(deposit)
      const receiveBN = new anchor.BN(receive)
      const mintAPk = new PublicKey(mintA)
      const mintBPk = new PublicKey(mintB)

      const tx = await makeEscrowAction(wallet, connection, seedBN, depositBN, receiveBN, mintAPk, mintBPk)
      toast.success(`Escrow created — tx: ${tx}`)
    } catch (e: any) {
      console.error(e)
      toast.error(String(e?.message ?? e ?? 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 border rounded-lg shadow-md bg-gray-900 text-white space-y-4">
      <h2 className="text-xl font-bold">Make Escrow</h2>
      <input
        type="number"
        placeholder="Seed (u64)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />
      <input
        type="number"
        placeholder="Deposit Amount (u64)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={deposit}
        onChange={(e) => setDeposit(e.target.value)}
      />
      <input
        type="number"
        placeholder="Receive Amount (u64)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={receive}
        onChange={(e) => setReceive(e.target.value)}
      />
      <input
        type="text"
        placeholder="Mint A (Token to lock)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={mintA}
        onChange={(e) => setMintA(e.target.value)}
      />
      <input
        type="text"
        placeholder="Mint B (Token to receive)"
        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
        value={mintB}
        onChange={(e) => setMintB(e.target.value)}
      />
      <button
        onClick={handleMake}
        disabled={loading || !isConnected}
        className="w-full p-2 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Create Escrow'}
      </button>
    </div>
  )
}
