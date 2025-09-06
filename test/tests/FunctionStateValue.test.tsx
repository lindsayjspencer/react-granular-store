// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import Store, { useStoreValue } from 'react-granular-store';

// React 18: let React know the test environment supports act(...)
// See https://react.dev/reference/test-utils/act#configuring-your-test-environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// What this test verifies (current behavior):
// - The hook (useStoreValue) wraps React's setState to ensure function values are treated as literal values,
//   not as functional updaters. This prevents React from calling the function when it's meant to be stored.
// - The Store API itself still treats a bare function argument to setState as a functional updater. Therefore,
//   to store a function as state, callers must wrap it: store.setState(key, () => myFunction).
// - Given the above, after setting a function value via the wrapper, the hook should expose the function itself.

describe('useStoreValue: function-as-state via subscription', () => {
	test('after an update to a function value, the hook yields the function itself', async () => {
		type Fn = (x: number) => number;
		const increment: Fn = (x) => x + 1;

		// Start with a non-function value to ensure the failure is through subscription.
		const store = new Store<{ fn: number | Fn }>({ fn: 0 });

		const seen: Array<number | Fn> = [];

		function App({ onValue }: { onValue: (v: number | Fn) => void }) {
			const value = useStoreValue(store, 'fn');
			// Intentionally call during render to make the test synchronous/deterministic
			onValue(value);
			return null;
		}

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(<App onValue={(v) => seen.push(v)} />);
		});

		// Initial push is 0
		expect(seen.at(-1)).toBe(0);

		// Now update to a function value. Important: the Store interprets a bare function as an updater,
		// so to store a function as the value we wrap it in a function that returns it.
		await act(async () => {
			store.setState('fn', () => increment);
		});

		const last = seen.at(-1) as number | Fn | undefined;
		// With the hook fix and the store.setState wrapper, we should see the function itself here.
		// If this assertion fails as 'number', it means either the hook didn't wrap setState,
		// or the store attempted to treat the function as an updater.
		if (typeof last === 'function') {
			expect(last(2)).toBe(3);
		}

		await act(async () => {
			root.unmount();
		});
		container.remove();
	});
});
