// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Store, { useStoreValue } from 'react-granular-store';

// React 18: let React know the test environment supports act(...)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useStoreValue: updater pattern (setState(prev => ...))', () => {
	test('subscribing component sees increments from functional updaters', async () => {
		const store = new Store({ count: 0 });
		const seen: number[] = [];

		function App({ onValue }: { onValue: (v: number) => void }) {
			const value = useStoreValue(store, 'count');
			onValue(value);
			return null;
		}

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(<App onValue={(v) => seen.push(v)} />);
		});

		// Initial render reflects initial state
		expect(seen.at(-1)).toBe(0);

		// First updater increments to 1
		await act(async () => {
			store.setState('count', (prev) => prev + 1);
		});
		expect(seen.at(-1)).toBe(1);

		// Second updater increments to 2
		await act(async () => {
			store.setState('count', (prev) => prev + 1);
		});
		expect(seen.at(-1)).toBe(2);

		await act(async () => {
			root.unmount();
		});
		container.remove();
	});
});
