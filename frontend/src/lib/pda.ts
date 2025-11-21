import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./anchorClient";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const getEscrowPDA = (maker: PublicKey, seed: anchor.BN) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), maker.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
    );
};

export const getVaultPDA = (escrow: PublicKey, mintA: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [escrow.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintA.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
};

export const findAssociatedTokenAddress = (owner: PublicKey, mint: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
};