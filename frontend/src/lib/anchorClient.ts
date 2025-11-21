import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import idl from "@/idl/idl.json";
import { EscrowAnchor } from "@/lib/types/escrow_anchor";

// The program ID from the IDL
export const PROGRAM_ID = new PublicKey(idl.address);

// Define the interface that Anchor's provider expects
export interface AnchorWallet {
    publicKey: PublicKey;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
}

export const getAnchorClient = (wallet: AnchorWallet, connection: Connection) => {
    const provider = new anchor.AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
    });

    const program = new anchor.Program(idl as anchor.Idl, provider) as anchor.Program<EscrowAnchor>;

    return { program, provider };
};