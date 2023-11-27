export default function objectToRecord(
  obj: Record<string, any>
): Record<string, string> {
  const result: Record<string, string> = {};

  Object.keys(obj).forEach((key) => {
    result[key] = String(obj[key]);
  });

  return result;
}
