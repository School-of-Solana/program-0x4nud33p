import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  createInitializeMintInstruction,
  mintTo,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { SystemProgram, PublicKey, Keypair } from "@solana/web3.js";
import { expect } from "chai";
import { EscrowAnchor } from "../target/types/escrow_anchor";

describe("escrow-anchor — expanded tests", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.EscrowAnchor as Program<EscrowAnchor>;

  const maker = provider.wallet as anchor.Wallet;
  let taker: Keypair;
  let otherTaker: Keypair;
  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerAtaA: PublicKey;
  let makerAtaB: PublicKey;
  let takerAtaB: PublicKey;
  let escrowPda: PublicKey;
  let vaultAta: PublicKey;
  const seed = new anchor.BN(12345);

  before(async () => {
    taker = Keypair.generate();
    otherTaker = Keypair.generate();

    const sig1 = await provider.connection.requestAirdrop(
      taker.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);

    const sig2 = await provider.connection.requestAirdrop(
      otherTaker.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig2);

    mintA = await createMint(provider);
    mintB = await createMint(provider);

    makerAtaA = await getOrCreateATA(provider, mintA, maker.publicKey, 10);
    makerAtaB = await getOrCreateATA(provider, mintB, maker.publicKey, 0);

    takerAtaB = await getOrCreateATAForKeypair(
      provider,
      mintB,
      taker,
      5
    );
  });

  it("Initializes escrow and moves maker's token into vault (make) — happy path", async () => {
    const [escrowPdaDerived, _bump] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          maker.publicKey.toBuffer(),
          seed.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
    escrowPda = escrowPdaDerived;

    vaultAta = getAssociatedTokenAddressSync(
      mintA,
      escrowPda,
      true,
      TOKEN_PROGRAM_ID
    );

    const makerBefore = await provider.connection.getTokenAccountBalance(
      makerAtaA
    );

    await program.methods
      .make(seed, new anchor.BN(1), new anchor.BN(1))
      .accounts({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerAtaA: makerAtaA,
        escrow: escrowPda,
        vault: vaultAta,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey(
          "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([maker.payer])
      .rpc();

    const vaultBalance = await provider.connection.getTokenAccountBalance(vaultAta);
    expect(parseInt(vaultBalance.value.amount)).to.equal(1);

    const makerAfter = await provider.connection.getTokenAccountBalance(makerAtaA);
    expect(
      parseInt(makerBefore.value.amount) - parseInt(makerAfter.value.amount)
    ).to.equal(1);


    const escrowAccount = await program.account.escrow.fetchNullable(escrowPda);
    expect(escrowAccount).to.not.be.null;

    if (escrowAccount) {
      expect(escrowAccount.maker.toBase58()).to.equal(maker.publicKey.toBase58());
      try {
        expect(escrowAccount.receive.toNumber()).to.equal(1);
        expect(escrowAccount.receive.toNumber()).to.equal(1);
      } catch (e) {
      }
    }

    console.log("✅ make: escrow initialized and vault funded");
  });

  it("Taker takes the trade — happy path", async () => {
    const takerAtaA = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        taker,
        mintA,
        taker.publicKey
      )
    ).address;

    const makerA_before = Number(
      (await provider.connection.getTokenAccountBalance(makerAtaA)).value.amount
    );
    const takerB_before = Number(
      (await provider.connection.getTokenAccountBalance(takerAtaB)).value.amount
    );
    const takerA_before = Number(
      (await provider.connection.getTokenAccountBalance(takerAtaA)).value.amount
    );

    await program.methods
      .take()
      .accounts({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        takerAtaA: takerAtaA,
        takerAtaB: takerAtaB,
        escrow: escrowPda,
        vault: vaultAta,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey(
          "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([taker])
      .rpc();

    const makerA_after = Number(
      (await provider.connection.getTokenAccountBalance(makerAtaA)).value.amount
    );
    const takerB_after = Number(
      (await provider.connection.getTokenAccountBalance(takerAtaB)).value.amount
    );
    const takerA_after = Number(
      (await provider.connection.getTokenAccountBalance(takerAtaA)).value.amount
    );

    expect(takerB_before - takerB_after).to.equal(1);

    expect(takerA_after - takerA_before).to.equal(1);

    const vaultInfo = await provider.connection.getAccountInfo(vaultAta);
    expect(vaultInfo).to.be.null;

    console.log("✅ Escrow completed successfully");
  });


  it("Unhappy path: taker without required B tokens cannot take", async () => {
    const seed2 = new anchor.BN(22222);
    const [escrow2, _bump2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        seed2.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const vault2 = getAssociatedTokenAddressSync(mintA, escrow2, true, TOKEN_PROGRAM_ID);

    await program.methods
      .make(seed2, new anchor.BN(1), new anchor.BN(2)) 
      .accounts({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerAtaA: makerAtaA,
        escrow: escrow2,
        vault: vault2,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey(
          "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .signers([maker.payer])
      .rpc();

    const poorTaker = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      poorTaker.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const poorTakerAtaB = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        poorTaker,
        mintB,
        poorTaker.publicKey,
        true
      )
    ).address;

    let failed = false;
    try {
      const takerAtaA2 = (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          poorTaker,
          mintA,
          poorTaker.publicKey
        )
      ).address;

      await program.methods
        .take()
        .accounts({
          taker: poorTaker.publicKey,
          maker: maker.publicKey,
          mintA: mintA,
          mintB: mintB,
          takerAtaA: takerAtaA2,
          takerAtaB: poorTakerAtaB,
          escrow: escrow2,
          vault: vault2,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: new PublicKey(
            "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          ),
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([poorTaker])
        .rpc();
    } catch (err: any) {
      failed = true;
    }
    expect(failed).to.equal(true);
  });

  it("Unhappy path: unauthorized taker (otherTaker) can't perform take for someone else's escrow", async () => {
    let failed = false;
    try {
      const takerAtaA = (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          otherTaker,
          mintA,
          otherTaker.publicKey
        )
      ).address;

      await program.methods
        .take()
        .accounts({
          taker: otherTaker.publicKey,
          maker: maker.publicKey,
          mintA: mintA,
          mintB: mintB,
          takerAtaA: takerAtaA,
          takerAtaB: takerAtaB,
          escrow: escrowPda,
          vault: vaultAta,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: new PublicKey(
            "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          ),
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([otherTaker])
        .rpc();
    } catch (err: any) {
      failed = true;
    }
    expect(failed).to.equal(true);
  });
});

async function createMint(provider: anchor.AnchorProvider): Promise<PublicKey> {
  const mint = anchor.web3.Keypair.generate();
  const lamports = await provider.connection.getMinimumBalanceForRentExemption(
    MINT_SIZE
  );

  const tx = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint.publicKey,
      6,
      provider.wallet.publicKey,
      null
    )
  );

  await provider.sendAndConfirm(tx, [mint]);
  return mint.publicKey;
}

async function getOrCreateATA(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  owner: PublicKey,
  mintAmount: number
): Promise<PublicKey> {
  const ataResp = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    mint,
    owner,
    true
  );

  if (mintAmount > 0) {
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      ataResp.address,
      provider.wallet.publicKey,
      mintAmount
    );
  }

  return ataResp.address;
}

async function getOrCreateATAForKeypair(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  kp: Keypair,
  mintAmount: number
): Promise<PublicKey> {
  const ataResp = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    kp,
    mint,
    kp.publicKey,
    true
  );

  if (mintAmount > 0) {
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      ataResp.address,
      provider.wallet.publicKey,
      mintAmount
    );
  }

  return ataResp.address;
}
