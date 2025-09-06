// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Store, { useStoreValue } from 'react-granular-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useStoreValue: initial function-as-state', () => {
	test('returns the function when initial state is a function', async () => {
		type Fn = (x: number) => number;
		const increment: Fn = (x) => x + 1;
		const double: Fn = (x) => x * 2;

		const store = new Store<{ fn: Fn }>({ fn: increment });

		let latest: unknown = null;

		function App() {
			const fn = useStoreValue(store, 'fn');
			latest = fn;
			return null;
		}

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(<App />);
		});

		expect(typeof latest).toBe('function');
		if (typeof latest === 'function') expect((latest as Fn)(2)).toBe(3);

		// Update to a different function value via the wrapper pattern
		await act(async () => {
			store.setState('fn', () => double);
		});

		expect(typeof latest).toBe('function');
		if (typeof latest === 'function') expect((latest as Fn)(3)).toBe(6);

		await act(async () => {
			root.unmount();
		});
		container.remove();
	});
});
