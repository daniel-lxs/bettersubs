export default function getEnvOrThrow(key: string): string {
  const envVariable = process.env[key];

  if (envVariable === undefined) {
    throw new Error(`Environment variable "${key}" is not defined`);
  }

  return envVariable;
}
