import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { getAnchorClient, AnchorWallet } from "./anchorClient";
import { getEscrowPDA, getVaultPDA, findAssociatedTokenAddress } from "./pda";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Interface matching the properties we need from useWallet()
interface WalletContextState {
    publicKey: PublicKey | null;
    signTransaction: ((transaction: any) => Promise<any>) | undefined;
    signAllTransactions: ((transactions: any[]) => Promise<any[]>) | undefined;
}

const getWalletOrReject = (wallet: WalletContextState): AnchorWallet => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
        throw new Error("Wallet not connected");
    }
    return {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
    };
};

export const makeEscrow = async (
    wallet: WalletContextState,
    connection: Connection,
    seed: anchor.BN,
    depositAmount: anchor.BN,
    receiveAmount: anchor.BN,
    mintA: PublicKey,
    mintB: PublicKey
) => {
    const anchorWallet = getWalletOrReject(wallet);
    const { program } = getAnchorClient(anchorWallet, connection);

    const maker = anchorWallet.publicKey;
    const [escrowPda] = getEscrowPDA(maker, seed);
    const [vaultPda] = getVaultPDA(escrowPda, mintA);
    const makerAtaA = findAssociatedTokenAddress(maker, mintA);

    try {
        const tx = await program.methods
            .make(seed, depositAmount, receiveAmount)
            .accounts({
                maker: maker,
                mintA: mintA,
                mintB: mintB,
                makerAtaA: makerAtaA,
                escrow: escrowPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            } as any)
            .rpc();

        return tx;
    } catch (error) {
        console.error("Error in makeEscrow:", error);
        throw error;
    }
};

export const refundEscrow = async (
    wallet: WalletContextState,
    connection: Connection,
    seed: anchor.BN,
    mintA: PublicKey
) => {
    const anchorWallet = getWalletOrReject(wallet);
    const { program } = getAnchorClient(anchorWallet, connection);

    const maker = anchorWallet.publicKey;
    const [escrowPda] = getEscrowPDA(maker, seed);
    const [vaultPda] = getVaultPDA(escrowPda, mintA);
    const makerAtaA = findAssociatedTokenAddress(maker, mintA);

    try {
        const tx = await program.methods
            .refund()
            .accounts({
                maker: maker,
                mintA: mintA,
                makerAtaA: makerAtaA,
                escrow: escrowPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            } as any)
            .rpc();

        return tx;
    } catch (error) {
        console.error("Error in refundEscrow:", error);
        throw error;
    }
};

export const takeEscrow = async (
    wallet: WalletContextState,
    connection: Connection,
    maker: PublicKey,
    seed: anchor.BN,
    mintA: PublicKey,
    mintB: PublicKey
) => {
    const anchorWallet = getWalletOrReject(wallet);
    const { program } = getAnchorClient(anchorWallet, connection);

    const taker = anchorWallet.publicKey;
    const [escrowPda] = getEscrowPDA(maker, seed);
    const [vaultPda] = getVaultPDA(escrowPda, mintA);

    const takerAtaA = findAssociatedTokenAddress(taker, mintA);
    const takerAtaB = findAssociatedTokenAddress(taker, mintB);
    const makerAtaB = findAssociatedTokenAddress(maker, mintB);

    try {
        const tx = await program.methods
            .take()
            .accounts({
                taker: taker,
                maker: maker,
                mintA: mintA,
                mintB: mintB,
                takerAtaA: takerAtaA,
                takerAtaB: takerAtaB,
                makerAtaB: makerAtaB,
                escrow: escrowPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            } as any)
            .rpc();

        return tx;
    } catch (error) {
        console.error("Error in takeEscrow:", error);
        throw error;
    }
};