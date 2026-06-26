/**
 * ConfidentialTokenWrappersRegistry ABI (minimal, read-focused).
 *
 * Signatures verified against:
 * https://docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry
 *
 * The registry stores TokenWrapperPair{ tokenAddress, confidentialTokenAddress,
 * isValid }. `getTokenConfidentialTokenPairs()` returns ALL pairs including
 * revoked ones — so always honor the `isValid` flag in the UI.
 */
export const registryAbi = [
  {
    type: "function",
    name: "getTokenConfidentialTokenPairsLength",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getTokenConfidentialTokenPairs",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getTokenConfidentialTokenPairsSlice",
    stateMutability: "view",
    inputs: [
      { name: "fromIndex", type: "uint256" },
      { name: "toIndex", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "confidentialTokenAddress", type: "address" },
          { name: "isValid", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getConfidentialTokenAddress",
    stateMutability: "view",
    inputs: [{ name: "erc20TokenAddress", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "confidentialToken", type: "address" },
    ],
  },
  {
    type: "function",
    name: "isConfidentialTokenValid",
    stateMutability: "view",
    inputs: [{ name: "confidentialWrapperAddress", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
