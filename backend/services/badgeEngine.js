// Badge rules engine.
// Full criteria evaluation lands in Epic D (#4). For now this is a stable hook
// invoked inside the match transaction; it returns newly-earned badges (none yet).
//
// Signature: evaluateBadges(client, userId) -> Promise<Array<{key,name}>>
// `client` is the in-transaction pg client so badge inserts are atomic with the match.

// eslint-disable-next-line no-unused-vars
export async function evaluateBadges(_client, _userId) {
  return [];
}
