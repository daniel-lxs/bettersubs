export function objectHasId(object: Object): object is { id: number } {
  return object.hasOwnProperty('id');
}
