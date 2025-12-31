import { defineConfig } from 'orval';

/**
 * Orval Configuration
 *
 * Generate React Query hooks and types from OpenAPI specifications.
 * Run with: npm run api:generate
 *
 * Documentation: https://orval.dev/
 */
export default defineConfig({
  // Example API configuration - update with your API spec
  api: {
    input: {
      // Replace with your OpenAPI spec URL or local file path
      target: 'https://api.example.com/swagger/v1/swagger.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/types/generated',
      client: 'react-query',
      httpClient: 'axios',
      mock: true, // Generates MSW handlers
      override: {
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
      allParamsOptional: true,
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
