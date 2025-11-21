import * as anchor from "@coral-xyz/anchor";
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { getAnchorClient } from "./anchorClient";
import { getEscrowPDA } from "./pda";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { Wallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

export async function makeEscrow(wallet: Wallet, params: {
    mintA: string;
    mintB: string;
    seed: bigint;
    depositAmount: number;
    receiveAmount: number;
    maker: PublicKey;
}) {
    const { program, provider, connection } = getAnchorClient(wallet as unknown as anchor.Wallet);

    const mintA = new anchor.web3.PublicKey(params.mintA);
    const mintB = new anchor.web3.PublicKey(params.mintB);

    const [escrowPda] = getEscrowPDA(params.maker, params.seed);

    const makerAtaA = await getAssociatedTokenAddress(mintA, params.maker);
    const vaultAta = await getAssociatedTokenAddress(mintA, escrowPda);

    const tx = new anchor.web3.Transaction();

    const vaultInfo = await connection.getAccountInfo(vaultAta);
    if (!vaultInfo) {
        tx.add(createAssociatedTokenAccountInstruction(
            params.maker,
            vaultAta,
            escrowPda,
            mintA
        ));
    }

    tx.add(
        await program.methods
            .make(
                new anchor.BN(params.seed.toString()),
                new anchor.BN(params.depositAmount),
                new anchor.BN(params.receiveAmount)
            )
            .accounts({
                maker: params.maker,
                mintA,
                mintB,
                makerAtaA,
                escrow: escrowPda,
                vault: vaultAta,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
            } as any)
            .instruction()
    );

    return provider.sendAndConfirm(tx);
}
