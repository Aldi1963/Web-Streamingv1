const UNSUPPORTED_PROVIDERS = {
  pinedrama: "Membutuhkan signing header TikTok dari sesi aplikasi yang belum dikelola server.",
} as const;

export function isProviderSupported(providerSlug: string) {
  return !(providerSlug in UNSUPPORTED_PROVIDERS);
}

export function providerSupportReason(providerSlug: string) {
  return UNSUPPORTED_PROVIDERS[providerSlug as keyof typeof UNSUPPORTED_PROVIDERS] ?? null;
}
