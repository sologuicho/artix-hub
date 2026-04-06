import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      const u = String(url);
      if (u.includes('/me')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ ok: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ ok: true, notifications: [], unreadCount: 0 }),
      });
    })
  );
});

describe('App', () => {
  it('renders the main header brand', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText('ARTIX HUB').length).toBeGreaterThanOrEqual(1);
    });
  });
});
