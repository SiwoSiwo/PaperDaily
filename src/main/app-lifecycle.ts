let quitting = false;

export function markAppQuitting(): void {
  quitting = true;
}

export function isAppQuitting(): boolean {
  return quitting;
}
