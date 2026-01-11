/**
 * MSW Request Handlers
 *
 * API mocking for development and testing.
 * Add your mock API endpoints here.
 */

import { http, HttpResponse, delay } from 'msw';

// Simulate network delay (configurable)
const MOCK_DELAY = 500;

export const handlers = [
  // ============================================
  // EXAMPLE ENDPOINTS
  // ============================================

  // Example: Get current user
  // http.get('/api/user', async () => {
  //   await delay(MOCK_DELAY);
  //   return HttpResponse.json({
  //     id: '1',
  //     name: 'John Doe',
  //     email: 'john@example.com',
  //   });
  // }),

  // Example: Get list of items
  // http.get('/api/items', async () => {
  //   await delay(MOCK_DELAY);
  //   return HttpResponse.json([
  //     { id: '1', name: 'Item 1' },
  //     { id: '2', name: 'Item 2' },
  //   ]);
  // }),

  // Example: Create an item
  // http.post('/api/items', async ({ request }) => {
  //   await delay(MOCK_DELAY);
  //   const body = await request.json();
  //   return HttpResponse.json(
  //     { id: `${Date.now()}`, ...body },
  //     { status: 201 }
  //   );
  // }),

  // Example: Delete an item
  // http.delete('/api/items/:id', async () => {
  //   await delay(MOCK_DELAY);
  //   return new HttpResponse(null, { status: 204 });
  // }),
];
