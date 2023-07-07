import AggregateError from 'es-aggregate-error';

export async function withRetries<T extends () => any>(
  fn: T,
  nRetries: number
): Promise<T extends () => infer R ? R : never> {
  const errors: Error[] = [];
  for (let i = 0; i < nRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      errors.push(err);
    }
  }
  throw new AggregateError(
    errors,
    `Operation failed after ${nRetries} attempts: ${errors
      .map((err) => err.message)
      .join(', ')}`
  );
}
