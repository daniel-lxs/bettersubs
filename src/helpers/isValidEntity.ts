function isValidEntity<T>(obj: any, keys: (keyof T)[]): obj is T {
  return keys.every((key) => key in obj);
}
