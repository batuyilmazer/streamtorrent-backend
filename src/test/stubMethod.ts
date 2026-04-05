const restorers: Array<() => void> = [];

export function stubMethod(
  target: object,
  key: PropertyKey,
  implementation: unknown,
) {
  const owner = target as Record<PropertyKey, unknown>;
  const hadOwnProperty = Object.prototype.hasOwnProperty.call(owner, key);
  const previousValue = owner[key];
  owner[key] = implementation;
  restorers.push(() => {
    if (hadOwnProperty) {
      owner[key] = previousValue;
      return;
    }
    delete owner[key];
  });
}

export function restoreStubbedMethods() {
  while (restorers.length > 0) {
    restorers.pop()?.();
  }
}
