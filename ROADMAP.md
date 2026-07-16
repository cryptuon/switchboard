# Switchboard Roadmap 🗺️

> **Distinct from the Solana "Switchboard" oracle.** This document describes
> Cryptuon Switchboard — a cross-chain **state synchronization and coordination**
> platform that uses Solana as a coordination clock. It is not an on-chain price
> oracle and is unrelated to the similarly named Solana oracle network.

## Vision

Switchboard exists to make **cross-chain state a single call**.

The 2026 on-chain landscape is defined by fragmentation: liquidity, state, and users spread across dozens of L1s and L2s — and a fast-growing class of **autonomous agents** that need to act across many of those chains at once. Agentic payments, intent-solvers, and cross-chain strategies all hit the same wall: coordinating N bridges, each with its own validator set, message format, and multi-second quorum, does not compose and does not move at agent speed.

Our bet is **atomic composability through a single coordinator**. Instead of a bespoke bridge per corridor, every supported chain agrees to watch one Solana coordinator program. A source event commits to the coordinator in the next slot (~400ms); a competing relayer pool races the destination transactions; each destination proves the message with the strongest verifier it can support (light-client, BLS threshold, or zk receipt). The result is one integration — one SDK call, one HTTPS surface — that fans out to every supported chain inside a single latency budget.

That is the layer autonomous agents and intent-solvers need: **one write, many chains, sub-400ms**, instead of orchestrating N brittle integrations.

We are deliberate about what we are **not** building: not a new validator network, not a staking token, not a wallet. Switchboard is a coordination layer plus the operational stack to run it. Everything below is measured against that scope.

## Where we are today

- **Sub-400ms coordination** across 50+ EVM and non-EVM chains (p50 ~250ms, p99 <400ms in internal benchmarks).
- **2-service stack** — Customer API gateway (:3000) and Core Engine (:3001), MongoDB or PostgreSQL behind it, Solana coordinator + state-oracle programs above.
- **TypeScript SDK + REST** — one integration surface; adapters absorb per-chain encoding.
- **Pluggable verifiers** — light-client, BLS threshold signature, and zk-proof receipts, selectable per route.
- **Configurable finality policy** — `fail-open`, `fail-closed`, or `fallback` per route for Solana-liveness dependence.
- **MIT-licensed core** — the full monorepo (programs, services, SDK, demo) is open source.

## Milestones

### Near term — harden the coordination layer
- Stabilize the SDK surface (`read` / `write` / `trackTransaction`) and freeze the on-chain coordinator layout for a first tagged release.
- Publish per-release, per-chain p99 latency and verifier failure-rate numbers.
- Ship light-client verifiers for the highest-value EVM L2s; document exactly which chains use BLS-quorum today and why.
- Relayer-pool liveness: automatic exclusion of downed relayers within a slot, plus redundancy targets.

### Mid term — agent & intent ergonomics
- First-class **intent / agent** primitives: idempotent one-call multi-chain writes with per-route finality policy and receipts an agent can verify.
- Batched atomic-composability flows: commit-once fan-out with all-or-nothing semantics where destination chains allow it.
- Bring-your-own-signer flow for enterprise custody of signing material.
- Expanded observability: coordinator slot lag, per-route p99, and incident metrics exposed via Prometheus/Grafana out of the box.

### Longer term — coverage & trust minimization
- Broaden chain coverage past the initial high-value set, prioritized by demand (see below).
- Move more corridors from BLS-quorum toward light-client / zk verification as destination support matures.
- Third-party audits of the coordinator program and relayer/verifier paths ahead of any "production-ready" claim.

## Cheapest path to production

**Do not try to light up all 50+ chains at once.** The economically and operationally correct path is to coordinate on Solana and start with a *handful of the cheapest, highest-value L2s*, then expand as demand and security maturity justify it. Breadth is a marketing number; the production path is depth on a few corridors.

Recommended sequence:

1. **Coordinate on Solana first.** Get the coordinator + state-oracle programs, the Core Engine watcher, and the relayer pool solid on a single, fast, cheap clock before adding destinations.
2. **Start with a handful of cheap, high-value L2s.** Prioritize destinations where calldata is cheap and traffic is real — Base, Arbitrum, and Optimism are the natural first set — rather than paying to maintain 50 corridors of which most see no volume. Each new chain is added only when a real workload needs it.
3. **Prove one corridor end-to-end**, then clone the pattern. A working commit → coordinate → verify → ack loop on one L2 de-risks every subsequent chain.

### Production-viability checklist

Before any corridor is called production-ready, it must clear:

- **Relayer / oracle security** — relayer-pool signing model reviewed and (for high-value routes) audited; the Core Engine oracle path cannot be forged or replayed. No corridor ships on trust-me.
- **State-proof verification** — the destination verifier is the strongest the chain supports (light-client > zk receipt > BLS quorum). Every corridor documents which verifier it uses and the trust assumption that implies.
- **Chain-coverage prioritization** — chains are added by demand and cost, cheapest-high-value-first; coverage breadth never outruns the ability to operate each corridor safely.
- **Liveness / redundancy** — relayer redundancy and automatic exclusion of downed relayers within a slot; explicit, tested behavior under a Solana slow-slot or halt via the route's finality policy.
- **SDK stability** — a frozen, versioned SDK and on-chain layout with a documented deprecation policy, so integrators (and agents) are not broken between releases.
- **Monitoring** — coordinator slot lag, per-route p99 latency, verifier failure rate, and incidents-per-million-ops exported and alertable before a corridor carries production value.

## Contributing

Roadmap items are tracked as GitHub issues. If a specific chain or verifier is blocking your adoption, open an issue or reach out — Enterprise customers can sponsor a chain integration. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

Docs: [docs.cryptuon.com/switchboard](https://docs.cryptuon.com/switchboard/) · Site: [switchboard.cryptuon.com](https://switchboard.cryptuon.com/) · Contact: [contact@cryptuon.com](mailto:contact@cryptuon.com)
