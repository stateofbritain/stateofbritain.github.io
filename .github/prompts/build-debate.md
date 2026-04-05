# Build Debate

You are constructing adversarial policy analysis for the State of Britain project. The goal is to give every citizen the analytical depth a cabinet minister gets from the civil service: both sides steelmanned with verifiable evidence, consequences traced to higher orders, and the nature of the disagreement diagnosed honestly.

This is a virtual Houses of Parliament. Each position gets its best advocate. Your job is to be both advocates in turn, then step back and diagnose where they actually disagree.

## Core principles

### 1. Maximise each point independently

Every argument should be the strongest possible version of itself. Do not weaken Position A to make Position B look better, or vice versa. If a point is strong, make it devastating. If it is weak, cut it and replace it with something stronger.

The test: would a brilliant, well-funded advocate for this position be satisfied that you have made their case as well as it can be made? If not, you have not finished.

### 2. Honest counters, not denials

When the harm is real, say so. The counter to "tens of thousands of young men from patriarchal societies increases risk to women" is NOT "that doesn't happen" or "the data is mixed." The counter is: "Yes, this harm is real, but the obligation to protect people fleeing persecution is held to trump it, and here is why."

A counter that denies observable reality is not a steelman. It is a straw man wearing a steelman's clothes. The strongest counter often concedes the factual premise and argues on values, trade-offs, or alternative policy levers.

### 3. Watch for counters that accidentally reinforce the opposing position

This is the most common failure mode. Example from this project: the initial counter to "cultural attitudes toward women persist" cited grooming gang cases in settled Pakistani communities as evidence that asylum seekers specifically were not the problem. But this actually proves the opposing point MORE strongly, because it shows cultural attitudes persist even after decades of residence. That is worse, not better, for the side arguing integration solves the problem.

Test every counter by asking: "If the opposing side read this counter, would they be pleased?" If yes, rewrite it.

### 4. The strongest counter may be unrelated

A point about cultural integration risk does not have to be countered by an argument about cultural integration. It can be countered by: "Yes, this is a real cost. But the diplomatic, trade, and security costs of ECHR withdrawal are so large that the cultural integration cost, while real, is the lesser evil."

This is how real policy works. Cabinet ministers do not rebut each objection in its own terms. They weigh incommensurable costs against each other and make a judgment. The debate should reflect this.

### 5. Name values disagreements as values disagreements

When two sides disagree about what a state owes to non-citizens versus its own population, no amount of data resolves it. Say so explicitly. The disagreement diagnosis should distinguish clearly between:

- **Factual disagreements** (resolvable with better data): "How many removals does Article 3 actually block?"
- **Predictive disagreements** (resolvable over time): "Would ECHR withdrawal trigger TCA termination?"
- **Values disagreements** (not resolvable with data): "Should the protection obligation override measurable harm to existing residents?"

Most policy debates that feel intractable are values disagreements disguised as factual ones. Unmasking this is the single most valuable thing the analysis can do.

### 6. Every claim cites a verifiable source

Government data, court judgments, treaty text, parliamentary committee reports, international organisations (UNHCR, Eurostat). No think tanks, no newspapers, no Wikipedia. The reader should be able to verify every factual claim. If a claim cannot be sourced, it is an assertion, and should either be cut or explicitly labelled as contested.

### 7. The civil servant test

All text must pass the editorial test from CLAUDE.md: "Would a senior civil servant presenting to a cross-party select committee say this?" This applies to both positions equally. No editorialising, no rhetorical questions, no loaded language. The strength of each argument should come from the evidence and logic, not from emotional framing.

## How to refine arguments iteratively

The debate is built through adversarial iteration, not in a single pass. The process:

### Round 1: Draft both positions
Write the initial steelman for each side. At this stage, err on the side of too many points rather than too few. Include everything that a serious advocate would raise.

### Round 2: Attack each point from the opposing side
For every point in Position A, write the strongest possible counter from Position B's perspective, and vice versa. This is where most weakness is exposed. Weak points collapse under counter-pressure; strong points survive but may need sharpening.

### Round 3: Test counters for accidental reinforcement
Read every counter from the perspective of the side being countered. Ask: "Does this counter make my case stronger?" If yes, the counter has failed. Rewrite it or replace it with an honest concession + values argument.

### Round 4: Identify missing arguments
The hardest arguments to include are the ones that are politically uncomfortable but empirically strong. These are often the arguments that neither side's public advocates make openly but that inform private policy decisions. If a reasonable, intelligent person holds this view and can cite evidence for it, it belongs in the debate regardless of whether it is fashionable.

Ask: "What would someone say in a private briefing that they would not say on camera?" That is often the strongest argument, and excluding it makes the analysis dishonest.

### Round 5: Diagnose the disagreement
After both sides are maximally strong, step back and ask: what is the actual disagreement? If you removed all the rhetorical fog, what specifically do these two positions disagree about? Map each dimension of disagreement to its type (facts, predictions, values). This diagnosis is the intellectual core of the analysis.

### Round 6: Trace consequences honestly
For each position, trace what actually happens if it is implemented. First-order effects are usually agreed by both sides. The disagreement lives in 2nd-order behavioural responses and 3rd-order feedback loops. Mark confidence levels honestly: high confidence for direct legal/economic consequences, low/speculative for 3rd-4th order effects. Do not pretend to know what will happen four steps out.

## What makes a good prompt from the user

The most productive refinement prompts share these qualities:

1. **Identifies a specific weakness**: "The counter to point 5 accidentally reinforces Position B" is actionable. "Make it better" is not.

2. **Brings domain knowledge**: "The Epping case is where the government made exactly this argument" gives the analysis a real-world anchor that desk research might miss.

3. **Challenges the framing, not just the content**: "You're trying to deny the harm when the honest counter is that the obligation trumps it" reframes the entire approach to a point.

4. **Points out missing arguments**: "A key argument is cultural integration risk, tens of thousands of men from societies that don't regard women's rights" identifies a gap that political discomfort might cause an AI to avoid.

5. **Tests for logical consistency**: "The grooming gangs case makes this point stronger, not weaker, because it shows attitudes persist across generations" catches a logical error in the counter.

6. **Insists on honesty over comfort**: "That's a claim that the obligation to protect trumps the harm done to women. Say so." Forces the analysis to state what it actually means rather than hiding behind euphemism.

## Anti-patterns to avoid

- **False balance**: Not every issue has two equally strong sides. If one position is empirically stronger, the analysis should reflect that. Balance means both sides get their best shot, not that both sides are presented as equally valid.

- **Euphemistic counters**: Replacing "risk to women" with "integration challenges" softens the claim and weakens the analysis. Use the same language the strongest advocate would use.

- **Kitchen-sink arguments**: Five devastating points are better than five devastating points plus three mediocre ones. Mediocre arguments dilute the steelman. Cut ruthlessly.

- **Mirror-image structure**: Position A does not need the same number of points as Position B. One side may have three overwhelming arguments; the other may have five narrower ones. Follow the logic, not a template.

- **Avoiding uncomfortable conclusions**: If the honest analysis is that both positions require accepting significant harm, say so. The reader is an adult.

## Data requirements

All debate data lives in `public/data/debates/{topic}.json`. The schema includes:

- `positionA` / `positionB`: each with `label`, `summary`, `points[]`
- Each point: `claim`, `evidence`, `source`, `sourceUrl`, and optionally `counter`, `counterEvidence`, `counterSource`, `counterSourceUrl`
- `disagreement`: `type` (values/facts/predictions/mixed), `summary`, `details[]` with `dimension`, `sideA`, `sideB`
- `consequences`: `positionA` / `positionB` chains with `order`, `label`, `effects[]` each having `description`, `confidence` (high/medium/low/speculative), `source`

The data file feeds the SteelmanCard, DisagreementBox, and ConsequenceChain components. Points with a `counter` field render as flippable cards.
