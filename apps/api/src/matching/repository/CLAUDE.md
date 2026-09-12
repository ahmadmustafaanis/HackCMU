# matching/repository — atomicity contract

- Every join is a **single** `findOneAndUpdate` (see `mongoEventRepository.ts`)
  checking `status`, `expiresAt`, `isFull`, and non-membership in the same
  filter as the mutation — never a separate read, then a separate write.
- Every read path (`retrieveCandidates`, `joinIfValid`, `listOpen`)
  independently filters `expiresAt > now` — never rely only on `status`,
  since a background sweep may not have run yet.
- Capacity/duplicate-participant checks live in the *same* atomic operation
  as the participant mutation, never as a preceding check.
- The idempotency claim (`idempotencyStore.ts`) uses the unique index on
  `idempotencyKeys._id` and an `insertOne` that either succeeds (you claimed
  it) or throws `E11000` (someone already did) — never a check-then-insert.
- Prove this, don't just assert it: the concurrency test
  (`inMemoryEventRepository.test.ts` / the Mongo equivalent) races two
  `Promise.all` joins at capacity-minus-one and asserts exactly one succeeds.
