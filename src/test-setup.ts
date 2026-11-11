// Global setup for unit tests (runs before every spec file).
// The DOM environment (happy-dom) doesn't implement some browser APIs, and a few
// need patching to play well with zone.js; fix them here so specs stay clean.

window.scrollTo = (() => {}) as typeof window.scrollTo;

// zone.js wraps FileReader and copies over only the members it finds with
// for...in, i.e. enumerable ones. happy-dom declares readAsArrayBuffer() & co.
// as class methods on a parent class (non-enumerable), so they get dropped.
// Forward any missing methods to the original instance zone.js keeps.
const originalFileReader = (window as any)['__zone_symbol__FileReader'] as
  | typeof FileReader
  | undefined;
if (originalFileReader && originalFileReader !== FileReader) {
  const patchedProto = FileReader.prototype as any;
  for (
    let proto = originalFileReader.prototype;
    proto && proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor' || name in patchedProto) continue;
      const desc = Object.getOwnPropertyDescriptor(proto, name);
      if (typeof desc?.value !== 'function') continue;
      patchedProto[name] = function (this: any, ...args: unknown[]) {
        return this['__zone_symbol__originalInstance'][name](...args);
      };
    }
  }
}
