import useSWR from "/deps/swr.js";

export function useApi(key, options) {
  const minute = 60 * 1000;
  return useSWR(key, fetcher, {
    refreshInterval: 5 * minute,
    dedupingInterval: 1 * minute,
    ...options,
  });
}

async function fetcher(key) {
  // debug
  // const url = new URL("https://fungeon-civ6-discord-notify.glitch.me");
  // real
  const url = new URL(window.location);

  url.pathname = key;

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}
