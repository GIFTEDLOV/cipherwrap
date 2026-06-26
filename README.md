# CipherWrap

**Discover, wrap, unwrap, and decrypt Zama confidential tokens — all from one interface.**

> **Zama Developer Program — Season 3 · Bounty Track: Confidential Wrapper Registry App**

A production-grade frontend over Zama's official ERC-7984 Wrappers Registry on Sepolia.
No new contracts are deployed. CipherWrap surfaces every registered pair live from the on-chain
registry, gates every action on `isValid`, classifies the dual-tGBP edge case, provides a
public faucet for mock underlyings, and decrypts confidential balances end-to-end via
Zama's EIP-712 user-decryption flow.

---

## Live demo

<!-- LIVE_URL -->
> _Deployed on Vercel — link added after deploy._

---

## Screenshots

| Landing | Registry | Token detail | Decrypt |
|---------|----------|--------------|---------|
| ![Landing](./docs/screenshots/landing.png) | ![Registry](./docs/screenshots/registry.png) | ![Token detail](./docs/screenshots/token-detail.png) | ![Decrypt](./docs/screenshots/decrypt.png) |

---

## Bounty requirements checklist

| Requirement | Status | How CipherWrap meets it |
|---|---|---|
| Surface all ERC-20 ↔ ERC-7984 pairs on Sepolia | ✅ | `/registry` calls `getTokenConfidentialTokenPairs()` live on every page load; all 8 known pairs rendered with status and faucet badges |
| Check `isValid` before enabling wrap / unwrap | ✅ | `classifyPairs()` derives `canWrap` and `canUnwrap` from `isValid`; revoked pairs show a "Revoked" badge and all actions are disabled with a human-readable reason |
| Wrap ERC-20 → confidential (ERC-7984) | ✅ | Two-step `useApproveUnderlying` + `useShield` via `@zama-fhe/react-sdk`; idle / loading / success / error / user-rejected states all handled |
| Unwrap confidential → ERC-20 | ✅ | `useUnshield` (phase 1) + `useResumeUnshield` (phase 2 finalization); request ID surfaced when finalization is pending — no fake one-click collapse |
| EIP-712 user decryption | ✅ | `useGrantPermit` + `useConfidentialBalance`; free off-chain signature, decrypted clear integer shown in the UI |
| Sepolia faucet for mock tokens | ✅ | Public `mint(address, uint256)` on 7 mock underlyings; capped at 1,000,000 tokens/call; `ctGBP` (restricted mint) explicitly excluded |
| Handle unknown / suspicious registry entries | ✅ | Entries absent from `KNOWN_WRAPPERS` are classified `unknown-metadata`, shown with raw addresses and a caution badge — no crash, no silent omission |
| Dual tGBP (ctGBPMock vs ctGBP) | ✅ | Duplicate-symbol detection flags both pairs; distinct labels ("Mock" vs real) so judges can tell them apart |

### Differentiators

| Feature | Description |
|---|---|
| **Registry Intelligence** | Pure classification layer (`registryIntelligence.ts`) that enriches live on-chain pairs with status, faucet eligibility, duplicate-symbol detection, and action gates with human-readable block reasons. Zero React, zero network — fully unit-tested (41 tests). |
| **Judge Demo Mode** (`/demo`) | Guided 9-step checklist: connect → switch to Sepolia → faucet → approve → wrap → grant permit → decrypt → unwrap → finalize. Each step unlocks only after the previous one completes. |
| **Developer Kit** (`/developers`) | Live code snippets generated from real config: read registry, approve + wrap, decrypt, unwrap (two-phase). Token selector updates all snippets with real Sepolia addresses. |
| **Session activity** | Token detail page lists every transaction performed in the current session (mint, approve, wrap, unwrap) with Etherscan links — derived from already-tracked state, no localStorage. |

---

## Sepolia contract addresses

All addresses verified against the
[official Zama protocol-apps repository](https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md)
and are the single source of truth in `src/config/zamaSepolia.ts`.

### Registry

| Contract | Address |
|---|---|
| Wrappers Registry | [`0x2f0750Bbb0A246059d80e94c454586a7F27a128e`](https://sepolia.etherscan.io/address/0x2f0750Bbb0A246059d80e94c454586a7F27a128e) |

### Wrappers and underlyings

| Symbol | Wrapper (ERC-7984) | Underlying (ERC-20) | Faucet | Notes |
|---|---|---|---|---|
| cUSDCMock | [`0x7c5B…3639`](https://sepolia.etherscan.io/address/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639) | [`0x9b5C…dFfF`](https://sepolia.etherscan.io/address/0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF) | ✅ Public | |
| cUSDTMock | [`0x4E7B…4491`](https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491) | [`0xa7dA…9b0`](https://sepolia.etherscan.io/address/0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0) | ✅ Public | |
| cWETHMock | [`0x4620…3158`](https://sepolia.etherscan.io/address/0x46208622DA27d91db4f0393733C8BA082ed83158) | [`0xff54…f3F`](https://sepolia.etherscan.io/address/0xff54739b16576FA5402F211D0b938469Ab9A5f3F) | ✅ Public | |
| cBRONMock | [`0xaa56…C891`](https://sepolia.etherscan.io/address/0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891) | [`0xFf02…b25E`](https://sepolia.etherscan.io/address/0xFf021fB13cA64e5354c62c954b949a88cfDEb25E) | ✅ Public | |
| cZAMAMock | [`0xf2D6…fbFB`](https://sepolia.etherscan.io/address/0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB) | [`0x7535…BF57`](https://sepolia.etherscan.io/address/0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57) | ✅ Public | ⚠ TEST token — not the real Sepolia ZAMA |
| ctGBPMock | [`0xfCE5…F7CC`](https://sepolia.etherscan.io/address/0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC) | [`0x93c9…1442`](https://sepolia.etherscan.io/address/0x93c931278A2aad1916783F952f94276eA5111442) | ✅ Public | Mock tGBP — distinct from ctGBP below |
| cXAUtMock | [`0xe4Fc…60C7`](https://sepolia.etherscan.io/address/0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7) | [`0x2437…d940`](https://sepolia.etherscan.io/address/0x24377AE4AA0C45ecEe71225007f17c5D423dd940) | ✅ Public | |
| ctGBP | [`0x167D…A208`](https://sepolia.etherscan.io/address/0x167DC962808B32CFFFc7e14B5018c0bE06A3A208) | [`0xf6Ef…7ff3`](https://sepolia.etherscan.io/address/0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3) | 🔒 Restricted | Wraps real testnet tGBP — no public faucet |

---

## Architecture / data flow

```
Browser
  │
  ├─ wagmi / viem
  │    │
  │    ├─ reads ──► Wrappers Registry
  │    │            getTokenConfidentialTokenPairs()
  │    │                     │
  │    │             classifyPairs()          [registryIntelligence.ts]
  │    │             ├─ status: valid | revoked
  │    │             ├─ faucet: public-mock | restricted | none
  │    │             ├─ isDuplicate (dual-tGBP detection)
  │    │             ├─ needsReview (unknown-metadata flag)
  │    │             └─ actions: canWrap/canUnwrap/canFaucet + block reasons
  │    │                     │
  │    │              ClassifiedPair[]
  │    │         ┌──────────┴──────────────────────┐
  │    │         │                                  │
  │    │    /registry                      /token/[wrapperAddress]
  │    │    searchable table               ┌──── Faucet (mock only)
  │    │    status / faucet badges         ├──── Approve (ERC-20)
  │    │                                   ├──── Wrap   (ERC-20 → cToken)
  │    ├─ writes ──► Underlying ERC-20     ├──── Grant permit (EIP-712)
  │    │             approve(wrapper, amt) ├──── Decrypt balance
  │    │                                   └──── Unwrap (2-phase)
  │    ├─ writes ──► Wrapper ERC-7984
  │    │             wrap(amount, proof)
  │    │
  │    └─ writes ──► Wrapper ERC-7984
  │                  unwrap(encAmt, proof)
  │                  finalizeUnwrap(requestId)
  │
  └─ @zama-fhe/react-sdk
       ├─ useGrantPermit       EIP-712 off-chain sign (free, no gas)
       ├─ useHasPermit         permit cache check
       ├─ useConfidentialBalance
       │    ├─ read  confidentialBalanceOf → ciphertext handle
       │    └─ relay decrypt → clear BigInt (never touches chain)
       ├─ useShield            wrap
       ├─ useUnshield          unwrap phase 1
       ├─ useResumeUnshield    unwrap phase 2 (finalization)
       └─ useRevokePermits     dev utility
```

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing — one-sentence explainer, Explore Registry and Judge Demo CTAs |
| `/registry` | Searchable, filterable live table of all registry pairs; status, faucet, and isValid badges |
| `/token/[wrapperAddress]` | Full token detail: identity card, faucet, approve, wrap, grant permit, decrypt, unwrap (two-phase), developer snippet, session tx history |
| `/developers` | Live code snippets (read registry, approve + wrap, decrypt, two-phase unwrap) with token selector injecting real addresses |
| `/demo` | Judge Demo Mode — 9-step guided checklist: connect → Sepolia → faucet → approve → wrap → grant permit → decrypt → unwrap → finalize |
| `/debug/decrypt` | Proof-sprint page: connect → select wrapper → grant permit → read + decrypt confidential balance |
| `/debug/wrap` | Proof-sprint page: mint → approve → wrap with step-by-step feedback |

---

## Tech stack

| Layer | Package | Version |
|---|---|---|
| Framework | Next.js | `^15.3` |
| UI | React | `^19` |
| Wallet / chain | wagmi + viem | `^2.14` / `^2.21` |
| FHE SDK | @zama-fhe/react-sdk | `^3.2.0` |
| Server state | @tanstack/react-query | `^5.60` |
| Styling | Tailwind CSS | `^3.4` |
| Language | TypeScript | `^5.7` |
| Tests | Vitest | `^4.1` |
| Deploy | Vercel | — |

---

## Project structure

```
src/
├── abis/
│   ├── mockErc20.ts              # ABI: public mint(address,uint256) on mock underlyings
│   └── registry.ts               # ABI: getTokenConfidentialTokenPairs()
├── app/
│   ├── debug/
│   │   ├── decrypt/page.tsx      # Debug: EIP-712 grant permit → decrypt
│   │   └── wrap/page.tsx         # Debug: mint → approve → wrap
│   ├── demo/page.tsx             # Judge Demo Mode (9-step checklist)
│   ├── developers/page.tsx       # Developer Kit with live snippets
│   ├── registry/page.tsx         # Registry table (live read + classify)
│   ├── token/[wrapperAddress]/
│   │   └── page.tsx              # Token detail + all actions
│   ├── globals.css               # Design tokens, .glass, .btn-gold, animations
│   ├── layout.tsx                # Root layout: fonts, providers, starfield, header
│   └── page.tsx                  # Landing page
├── components/
│   ├── CodeBlock.tsx             # Syntax-highlighted snippet display
│   ├── Header.tsx                # Nav: Home / Registry / Demo / Developers
│   ├── Providers.tsx             # wagmi + react-query + Zama SDK providers
│   ├── Reveal.tsx                # Scroll-reveal animation wrapper
│   ├── Starfield.tsx             # Animated canvas background (full / calm intensity)
│   ├── StarfieldWrapper.tsx      # Pathname-aware intensity switcher (layout-level)
│   └── WalletButton.tsx          # Connect wallet + Sepolia chain enforcer
├── config/
│   └── zamaSepolia.ts            # ★ Single source of truth: all verified addresses
└── lib/
    ├── devSnippets.ts            # Code snippet generators for /developers
    ├── registryIntelligence.ts   # Pure classifier: status, faucet, duplicates, gates
    ├── registryIntelligence.test.ts  # 41 unit tests
    ├── wagmiConfig.ts            # wagmi: connectors, transports, fallback RPCs
    ├── wagmiActionsV3Compat.ts   # wagmi v2 action shims for react-sdk v3
    ├── wagmiV3Compat.ts          # wagmi v2 hook shims for react-sdk v3
    └── zamaConfig.ts             # Zama SDK initialisation (chain, gateway)
```

---

## Quick start

**Prerequisites:** Node.js 18+, a browser wallet (MetaMask or similar) set to Sepolia.

```bash
git clone https://github.com/<YOUR_HANDLE>/cipherwrap.git
cd cipherwrap
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SEPOLIA_RPC_URL (optional)
npm run dev                  # http://localhost:3000
```

### Environment variable

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | No | Private Sepolia RPC (Alchemy / Infura / QuickNode). Falls back to `publicnode.com` and `ankr.com` if unset. |

A private endpoint is recommended for production — the public fallbacks are reliable for demos but rate-limited under sustained load.

### Other scripts

```bash
npm run build      # production build (Next.js)
npm run typecheck  # TypeScript strict check (no emit)
npm test           # 41 unit tests via Vitest
npm run lint       # ESLint
```

---

## Test coverage

All 41 tests are in `src/lib/registryIntelligence.test.ts` and cover the pure
classification layer — the logic that drives every action gate and badge in the UI.

| Suite | Tests | What is covered |
|---|---|---|
| Valid pair | 6 | `status: valid`, `isValid: true`, `canWrap/canUnwrap: true`, block reasons `null` |
| Revoked pair | 5 | `status: revoked`, `canWrap/canUnwrap: false`, human-readable block reasons set |
| Public-mock faucet | 3 | `faucet: public-mock`, `canFaucet: true`, `faucetBlockReason: null` |
| Restricted faucet | 3 | `faucet: restricted`, `canFaucet: false`, block reason contains "restricted" |
| Unknown token / no metadata | 8 | `faucet: none`, `metadata: null`, `needsReview: true`, `unknown-metadata` flag, `displaySymbol` → `?`, `displayName` → `Unknown token` |
| Duplicate symbol — dual tGBP | 4 | Both `ctGBPMock` and `ctGBP` receive `isDuplicate: true` and `duplicate-symbol` review flag |
| Non-duplicate token | 2 | `cUSDCMock` has `isDuplicate: false`, `needsReview: false` |
| Mixed registry set | 3 | Valid + revoked + unknown pairs in one call — correct gating across all four entries |
| `pairMatchesSearch` | 7 | Empty term, exact symbol, partial lowercase symbol, partial name, wrapper address prefix, underlying address prefix, no-match |
| **Total** | **41** | |

---

## Honest limitations

- **Testnet only.** All addresses are Sepolia. The app enforces `chainId 11155111` and refuses to operate on any other network.
- **No indexer / no history.** ERC-20 `balanceOf` and decrypted confidential balances are read live per session. Session activity (the per-session tx list) clears on refresh.
- **Unwrap finalization requires returning to the page.** If the tab is closed between phase 1 (`unwrap`) and phase 2 (`finalizeUnwrap`), the user must return to the token detail page and resume using the original phase-1 tx hash. The app surfaces this honestly with a visible Resume Unwrap panel.
- **`cZAMAMock` underlying is a test token.** It is not the real Sepolia ZAMA token. The UI labels it with an explicit warning.
- **Unknown registry entries are shown but not actionable.** If Zama adds a new pair before `KNOWN_WRAPPERS` is updated, the entry is displayed with raw addresses and a caution badge; wrap/unwrap remain disabled until static metadata is added.
- **Public RPC fallbacks may rate-limit.** Without `NEXT_PUBLIC_SEPOLIA_RPC_URL` set, heavy use of the public RPCs may hit rate limits. Set a private endpoint for sustained testing.

---

## Why FHE for token balances?

On a standard EVM chain every `balanceOf` is public. Any observer can watch on-chain activity, link addresses to real-world identities, and front-run large transfers. Zama's ERC-7984 wrappers store balances as FHE ciphertexts on-chain: only the holder — via an EIP-712 signed permit — can authorize decryption through Zama's gateway. The cleartext balance never appears on-chain; it is decrypted client-side after the relayer processes the holder's signed request.

CipherWrap demonstrates this flow end-to-end: a balance that is opaque on Etherscan becomes a plain integer in the UI, without any trusted intermediary seeing the value. Integrating the official registry (rather than deploying throwaway wrappers) means any app that adopts this pattern shares depth with every other registered wrapper on Sepolia, and can disable wrap/unwrap instantly via `isValid` without redeployment.

---

## License

MIT
