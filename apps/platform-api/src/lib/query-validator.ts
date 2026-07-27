import { safeParse } from 'valibot';
import type { BaseIssue, BaseSchema, InferOutput, InferInput, IssuePathItem } from 'valibot';

export type QueryValidatorResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validateQuery<T extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
  schema: T,
  input: unknown,
): QueryValidatorResult<InferOutput<T>> {
  const result = safeParse(schema, input);
  if (result.success) {
    return { success: true, data: result.output };
  }
  const messages = result.issues
    .map(
      (issue) =>
        `"${issue.path?.map((p: IssuePathItem) => p.key ?? p.value).join('.') ?? ''}": ${issue.message}`,
    )
    .join('; ');
  return { success: false, error: messages };
}

export function applyDefaults<T extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
  schema: T,
  input: InferInput<T>,
): InferOutput<T> {
  const result = safeParse(schema, input);
  if (result.success) {
    return result.output;
  }
  return input as unknown as InferOutput<T>;
}
