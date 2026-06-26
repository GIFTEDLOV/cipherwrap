# CipherWrap

> Discover, wrap, unwrap, and test Zama confidential tokens on Sepolia.

Submission for the **Zama Developer Program Season 3 Bounty Track — Confidential Wrapper Registry App**.

---

## What it does

CipherWrap turns Zama's on-chain Confidential Token Wrappers Registry into a polished developer product:

- **Live registry** — reads all wrapper pairs directly from the registry contract; never uses a static list as a substitute for the live read.
- **Faucet** — one-click `mint` for public-mint mock tokens (cUSDCMock, cZAMAMock, ctGBPMock).
- **Wrap** — FHE-encrypts an amount locally, then calls `wrap` on the ERC-7984 wrapper (`useShield`).
- **Decrypt** — reads `confidentialBalanceOf` (a ciphertext handle) and decrypts it via Zama EIP-712 user decryption.
- **Unwrap** — (in progress) multi-step `unwrap` + `finalizeUnwrap` flow with request ID tracking.

---

## Quick start

```bash
git clone <repo>
cd cipherwrap
npm install

# (optional) copy and fill env
cp .env.example .env.local

npm run dev
# open http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | No | Private Sepolia RPC (Alchemy / Infura / QuickNode). Falls back to two free public endpoints if unset. |

Recommended for production: provision a free Alchemy or Infura Sepolia endpoint and set `NEXT_PUBLIC_SEPOLIA_RPC_URL` in `.env.local` or your Vercel project settings. Without it the app uses `publicnode` and `ankr` as fallbacks — reliable for demos but rate-limited under sustained load.

---

## Sepolia addresses

All addresses verified against the [official Zama protocol-apps repo](https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md).

| Contract | Address |
|---|---|
| Wrappers Registry | `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` |
| cUSDCMock wrapper | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` |
| USDCMock underlying | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| cZAMAMock wrapper | `0x06C3Ab7D2FFF2CdFAB89Bba3e1aFC3d9b6d56f84` |
| ZAMAMock underlying | `0x5B3b6CF3d6D827aC64CB5e5B8D88DEBCb8dE2dFd` |
| ctGBPMock wrapper | `0xfA01a51d9Ca49395F09f4FaB14e487ebcbAa7034` |
| tGBPMock underlying | `0x1ECB6b00b53aA25f24765f07693E1b5b1b2B3B9a` |
| ctGBP wrapper (restricted mint) | `0x167D…A208` |

> **Note:** `cZAMAMock` wraps a TEST token, not the real Sepolia ZAMA token. Both `ctGBPMock` (public mint) and `ctGBP` (restricted mint) exist on Sepolia — they are labeled distinctly in the UI.

---

## Bounty checklist

- [x] Reads registry live via `getTokenConfidentialTokenPairs()`
- [x] Checks `isValid` before enabling wrap/unwrap; shows "Revoked" badge for invalid pairs
- [x] Unknown registry entries shown with raw addresses and caution badge — never crashes or silently hides
- [x] Faucet available only for public-mint mock tokens
- [x] `ctGBP` (restricted mint) has no faucet button
- [x] `cZAMAMock` labeled as TEST token
- [x] Both tGBP wrappers shown distinctly
- [x] Wrap works (`useShield` + explicit prior approval)
- [x] Decrypt works (EIP-712 user decryption via Zama relayer)
- [ ] Unwrap (multi-step `unwrap` + `finalizeUnwrap`) — in progress

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing — tagline, links to registry and demo |
| `/registry` | Searchable live table of all wrapper pairs |
| `/token/[wrapperAddress]` | Per-token page: metadata, faucet, wrap, decrypt, unwrap |
| `/developers` | Copyable code snippets for registry queries, wrap, and decrypt |
| `/demo` | Guided judge checklist: connect → faucet → approve → wrap → decrypt → unwrap |
| `/debug/decrypt` | Proof sprint step 7 — decrypt a confidential balance |
| `/debug/wrap` | Proof sprint steps 8–11 — mint → approve → wrap → decrypt |

---

## Tech stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **wagmi v2** + **viem v2** for wallet connection and contract reads/writes
- **@zama-fhe/react-sdk** for `useShield`, `useConfidentialBalance`, `useGrantPermit`, etc.
- **Vercel** for deployment

---

## Known limitations

- Unwrap is not yet implemented (multi-step `unwrap` + `finalizeUnwrap` flow).
- The `/registry` page shows all pairs including revoked ones, but the full per-token page (`/token/[wrapperAddress]`) is not yet built.
- Free public RPC fallbacks may be rate-limited under sustained load — set `NEXT_PUBLIC_SEPOLIA_RPC_URL` for production.
