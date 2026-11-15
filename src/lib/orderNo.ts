const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeOrderNo(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  let code = ''
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length]
  return code
}
