import { createEnv, type StandardSchemaV1 } from '@t3-oss/env-core';
import { z } from 'zod';

type EnvSource = Record<string, string | boolean | number | undefined>;

function formatIssues(
  issues: readonly {
    path?: readonly (PropertyKey | StandardSchemaV1.PathSegment)[];
    message: string;
  }[],
) {
  return issues.map((issue) => {
    const field = issue.path?.length
      ? issue.path.map(String).join('.')
      : 'unknown';
    return `${field}: ${issue.message}`;
  });
}

export function validateEnv(runtimeEnv: EnvSource) {
  return createEnv({
    clientPrefix: 'VITE_',
    client: {
      VITE_API_URL: z.url(),
      VITE_APP_ENV: z
        .enum(['development', 'production'])
        .default('development'),
    },
    runtimeEnv,
    emptyStringAsUndefined: true,
    onValidationError: (issues) => {
      const formattedIssues = formatIssues(issues);

      console.error('Admin environment validation failed.');
      formattedIssues.forEach((issue) => {
        console.error(`- ${issue}`);
      });

      throw new Error(
        `Admin environment validation failed: ${formattedIssues.join('; ')}`,
      );
    },
  });
}
