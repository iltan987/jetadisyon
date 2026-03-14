export function isValidReturnPath(path: string | null): path is string {
  if (!path) return false;
  // Must start with /, must NOT be protocol-relative (//), must NOT contain backslash
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}
