import { describe, expect, test, vi } from 'vitest';
import Store from 'react-granular-store';

// Runtime-focused tests that don't need React

describe('Store runtime behaviors', () => {
	test('unsubscribe stops receiving updates', () => {
		const store = new Store({ x: 0 });
		const seen: number[] = [];
		const unsub = store.subscribe('x', (v) => seen.push(v));

		store.setState('x', 1);
		expect(seen).toEqual([1]);

		unsub();
		store.setState('x', 2);
		expect(seen).toEqual([1]);
	});

	test('equalityFn prevents spurious notifications', () => {
		const store = new Store(
			{ data: { a: 1 } },
			{
				equalityFn: (o, n) => JSON.stringify(o) === JSON.stringify(n),
			},
		);
		const cb = vi.fn();
		store.on('data', cb);

		// Equivalent object, should not notify
		store.setState('data', { a: 1 });
		expect(cb).not.toHaveBeenCalled();

		// Different object, should notify once
		store.setState('data', { a: 2 });
		expect(cb).toHaveBeenCalledTimes(1);
	});

	test('batched updates notify once per key at resolution', async () => {
		const store = new Store({ a: 0, b: 0 }, { batchUpdates: true });
		const seenA: number[] = [];
		const seenB: number[] = [];

		store.on('a', (v) => seenA.push(v));
		store.on('b', (v) => seenB.push(v));

		// Multiple changes in same tick
		store.setState('a', (p) => p + 1); // 1
		store.setState('a', (p) => p + 1); // 2
		store.setState('b', (p) => p + 5); // 5

		expect(seenA).toEqual([]);
		expect(seenB).toEqual([]);

		await new Promise((r) => setTimeout(r, 0));

		expect(seenA).toEqual([2]);
		expect(seenB).toEqual([5]);
		expect(store.getState('a')).toBe(2);
		expect(store.getState('b')).toBe(5);
	});
});
