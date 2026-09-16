function shouldFetchForSignedInUser(isSignedIn) {
  return isSignedIn === true;
}
const UNAUTHORIZED_RETRY_DELAY_MS = 400;
async function fetchAuthedData(opts) {
  if (opts.isSignedIn !== true) return { state: "auth_not_ready" };
  await refreshSessionToken(opts.getToken);
  const first = await opts.fetch();
  if (!opts.isUnauthorized(first)) return { state: "ready", result: first, retriedUnauthorized: false };
  await new Promise((resolve) => setTimeout(resolve, opts.retryDelayMs ?? UNAUTHORIZED_RETRY_DELAY_MS));
  await refreshSessionToken(opts.getToken);
  const second = await opts.fetch();
  return { state: "ready", result: second, retriedUnauthorized: true };
}
async function refreshSessionToken(getToken) {
  try {
    await getToken({ skipCache: true });
  } catch {
  }
}
export {
  fetchAuthedData as f,
  shouldFetchForSignedInUser as s
};
