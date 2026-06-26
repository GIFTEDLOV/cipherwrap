# CLAUDE.md — CipherWrap

Project rules for Claude Code. Read this fully at the start of every session.

## What we are building

**CipherWrap** — a production-ready submission for the **Zama Developer Program
Season 3 Bounty Track** (Confidential Wrapper Registry App).

**Tagline:** Discover, wrap, unwrap, and test Zama confidential tokens.

The app turns Zama's official Confidential Token Wrappers Registry into a polished
product for users and developers on Sepolia.

**Deadline: July 7, 2026.** Optimize every decision for: coverage, correctness,
extensibility, UX, code quality, production-readiness (these are the judging
criteria, in Zama's own words).

## The single most important rule

**Correctness over polish. Never fake blockchain functionality.** No fake
balances, no fake "success" toasts, no simulated decryption. If a feature isn't
working yet, label it clearly as unfinished. A plain app that genuinely reads the
registry, wraps, and decrypts beats a beautiful app with broken Zama logic. Judges
are Zama engineers; they will test it live on Sepolia.

## Build order — RISK FIRST, do not reorder

Do NOT build the pretty UI first. Prove the hard parts work, in this order:

1. Connect wallet (wagmi + viem).
2. Detect / enforce Sepolia (chainId 11155111).
3. Read registry pair count + pairs live from the registry contract.
4. Render at least one valid pair (raw is fine at this stage).
5. Read one ERC-20 `balanceOf`.
6. Read one ERC-7984 `confidentialBalanceOf` (a ciphertext handle).
7. **Decrypt one confidential balance** via Zama EIP-712 user decryption.
8. Public `mint` on one mock underlying token (faucet).
9. `approve` the underlying ERC-20.
10. `wrap` a small amount.
11. Confirm the decrypted confidential balance changed.

Decryption (step 7) is the highest-risk item. If it fights us, STOP building UI
and make a tiny `/debug/decrypt` page that only: connects wallet → reads one known
wrapper's `confidentialBalanceOf` → decrypts it. Once that works, the rest is
normal app-building. Unwrap is the second-riskiest (see below).

Only after steps 1–11 pass do we build the polished pages.

## Verified Sepolia facts (source of truth)

All addresses verified against:
https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md

- Chain: Sepolia, chainId **11155111**.
- Wrappers Registry: **0x2f0750Bbb0A246059d80e94c454586a7F27a128e**
- Mock underlying ERC-20s have PUBLIC `mint(address,uint256)`, capped at
  **1,000,000 tokens per call**. Faucet button is for these only.
- `ctGBP` (non-mock, 0x167D…A208) has RESTRICTED mint — NO faucet button.
- `cZAMAMock`'s underlying is a TEST token, NOT the real Sepolia ZAMA token —
  label it clearly.
- Full verified list lives in `src/config/zamaSepolia.ts`. Do not edit addresses
  without re-checking the official source above.

## Correctness rules (these win the bounty)

- **Read the registry live.** `getTokenConfidentialTokenPairs()` returns ALL
  pairs including revoked ones. The static config is for display metadata, faucet
  eligibility, and fallback ONLY — never a substitute for the live read.
- **Always check `isValid`** before enabling wrap/unwrap. If a pair is
  invalid/revoked, show it but disable actions with a "Revoked" badge.
- **Handle unknown / suspicious entries gracefully.** Other bounty entrants have
  already flagged a suspicious mainnet entry ("cbbqTGBP", vanity underlying) and
  dual tGBP entries on Sepolia. If a registry entry isn't in our known list, show
  it as "Unknown token" with its raw addresses and a caution badge — never crash,
  never silently hide it.
- **Two tGBP wrappers exist on Sepolia:** `ctGBPMock` (public mint → faucet on)
  and `ctGBP` (restricted → faucet off). Label both distinctly so they're not
  confused.
- Every transaction needs explicit states: idle, loading, success, failure,
  user-rejected-signature, wrong-network.
- Every address gets a copy button and an Etherscan link.

## Unwrap — do not oversimplify

The OpenZeppelin ERC-7984 wrapper exposes `wrap`, `unwrap`, and `finalizeUnwrap`.
Unwrap may be multi-step (encrypted amount + input proof, then finalization). Do
NOT collapse it into a fake one-click flow. Use the real contract ABI (inspect the
deployed contract / OZ source — do not guess signatures). If finalization is
pending, show that honestly with a request ID. Build unwrap LAST among the actions.

## SDK rules

- Prefer **@zama-fhe/react-sdk** for encrypt/decrypt/query (React hooks, wallet
  adapters). Fall back to the core **@zama-fhe/sdk** only where the React SDK
  lacks an operation.
- Do NOT invent hook names or APIs. If unsure, inspect the installed package's
  types/examples before writing code. Check current docs at docs.zama.org.

## Tech stack

Next.js + TypeScript + Tailwind + wagmi/viem + @zama-fhe/react-sdk.
TanStack Query if useful. Vercel-ready. Keep TypeScript, lint, and build green.

## Design

Look like a serious developer product, not a hackathon toy. Read the Zama brand
world (confidential = encrypted-by-default) and pick a deliberate identity — not a
generic dark-theme-with-one-accent default. Cards, badges, skeleton loaders, empty
states, human-readable errors. Spend boldness in ONE signature element; keep the
rest quiet. Responsive to mobile; visible keyboard focus; respect reduced motion.

## Pages (build after the proof sprint passes)

- `/` landing — one-sentence explainer, "Explore Registry" + "Start Demo".
- `/registry` — searchable table of all pairs with status/faucet/balance badges.
- `/token/[wrapperAddress]` — metadata, validity, faucet, approve, wrap, decrypt,
  unwrap, developer snippet, session tx history.
- `/developers` — how to query the registry, check isValid, wrap, user-decrypt,
  with copyable snippets generated from the real app config.
- `/demo` — guided judge checklist: connect → faucet → approve → wrap → decrypt →
  unwrap.

## Definition of done (submission)

Live registry reads + isValid everywhere; faucet for mocks only; wrap works;
decrypt works; unwrap works or honestly shows pending; README with bounty
checklist + addresses + run steps + known limitations; deployed on Vercel;
3-minute demo video following the `/demo` flow.
