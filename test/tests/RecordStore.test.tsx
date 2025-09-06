import { assert, expect, test } from 'vitest';
import { Expect, Equal } from 'type-testing';
import { RecordStore, useStoreState, useStoreUpdate, useStoreValue } from 'react-granular-store';

// Test RecordStore
const recordStore = new RecordStore<number>({});

// RecordStore.setState should accept a number
recordStore.setState('count', 0);

// RecordStore.setState should not accept a string
// @ts-expect-error
recordStore.setState('count', 'something');

// RecordStore.setState should accept a function, and the type of the current value
// should be number | undefined
recordStore.setState('count', (current) => {
	type TEST_RECORDSTORE_SETSTATE = Expect<Equal<typeof current, number | undefined>>;
	return (current ?? 0) + 1;
});

// RecordStore.setState should not accept a function that returns a string
// @ts-expect-error
recordStore.setState('count', () => {
	return 'something';
});

// RecordStore.setState should return void
const shouldBeVoid = recordStore.setState('count', 0);
type TEST_RECORDSTORE_SETSTATE_VOID = Expect<Equal<typeof shouldBeVoid, void>>;

// RecordStore.getState should return number | undefined
const count = recordStore.getState('count');
type TEST_RECORDSTORE_GETSTATE = Expect<Equal<typeof count, number | undefined>>;

// RecordStore.getState should return number | undefined even if the key is not in the store
const notInStore = recordStore.getState('notInStore');
type TEST_RECORDSTORE_GETSTATE_NOT_IN_STORE = Expect<Equal<typeof notInStore, number | undefined>>;

// React component testing
const App = () => {
	const [count, setCount] = useStoreState(recordStore, 'count');
	type TEST_REACT_RECORDSTORE_USESTORESTATE_STATE = Expect<Equal<typeof count, number | undefined>>;
	type TEST_REACT_RECORDSTORE_USESTORESTATE_SETSTATE = Expect<
		Equal<
			typeof setCount,
			(newValue: (number | undefined) | ((oldValue: number | undefined) => number | undefined)) => void
		>
	>;
	const isolatedCount = useStoreValue(recordStore, 'count');
	type TEST_REACT_RECORDSTORE_USESTOREVALUE = Expect<Equal<typeof isolatedCount, number | undefined>>;
	const isolatedSetCount = useStoreUpdate(recordStore, 'count');
	type TEST_REACT_RECORDSTORE_USESTOREUPDATE = Expect<
		Equal<
			typeof isolatedSetCount,
			(newValue: (number | undefined) | ((oldValue: number | undefined) => number | undefined)) => void
		>
	>;

	const increment = () => {
		setCount((current) => {
			// The type of the current value should be number | undefined
			type TEST_REACT_RECORDSTORE_SETSTATE = Expect<Equal<typeof current, number | undefined>>;
			return (current ?? 0) + 1;
		});
	};

	return (
		<div>
			<button onClick={increment}>Increment</button>
			<p>Count: {count}</p>
			<p>Isolated count: {isolatedCount}</p>
			<button onClick={() => isolatedSetCount((current) => (current ?? 0) + 1)}>Increment isolated</button>
		</div>
	);
};

const getStore = () => {
	if (Math.random() > 0.5) {
		return recordStore;
	}
	return null;
};

// Test with null store
const AppWithNullStore = () => {
	const store = getStore();
	const [count, setCount] = useStoreState(store, 'count');
	type TEST_REACT_RECORDSTORE_USESTORESTATE_NULL_STATE = Expect<Equal<typeof count, number | null | undefined>>;
	type TEST_REACT_RECORDSTORE_USESTORESTATE_NULL_SETSTATE = Expect<
		Equal<
			typeof setCount,
			(newValue: (number | undefined) | ((oldValue: number | undefined) => number | undefined)) => void
		>
	>;
	const isolatedCount = useStoreValue(store, 'count');
	type TEST_REACT_RECORDSTORE_USESTOREVALUE_NULL = Expect<Equal<typeof isolatedCount, number | null | undefined>>;
	const isolatedSetCount = useStoreUpdate(store, 'count');
	type TEST_REACT_RECORDSTORE_USESTOREUPDATE_NULL = Expect<
		Equal<
			typeof isolatedSetCount,
			(newValue: (number | undefined) | ((oldValue: number | undefined) => number | undefined)) => void
		>
	>;

	const increment = () => {
		setCount((current) => {
			// The type of the current value should be number | null
			type TEST_REACT_RECORDSTORE_SETSTATE_NULL = Expect<Equal<typeof current, number | undefined>>;
			return (current ?? 0) + 1;
		});
	};

	return (
		<div>
			<button onClick={increment}>Increment</button>
			<p>Count: {count}</p>
			<p>Isolated count: {isolatedCount}</p>
			<button onClick={() => isolatedSetCount((current) => (current ?? 0) + 1)}>Increment isolated</button>
		</div>
	);
};

const familyStore = new RecordStore<{ name: string }>({
	1: { name: 'John Doe' },
	2: { name: 'Jane Doe' },
	3: { name: 'John Smith' },
	father: { name: 'Jacob Doe' },
	mother: { name: 'Jenny Doe' },
});

test('RecordStore: getState with initial values', () => {
	expect(familyStore.getState(2)).toStrictEqual({ name: 'Jane Doe' });
	expect(familyStore.getState('father')).toStrictEqual({ name: 'Jacob Doe' });
});

test('RecordStore: getState with non-existing key', () => {
	expect(familyStore.getState(4)).toBeUndefined();
	expect(familyStore.getState('non-existing')).toBeUndefined();
});

test('RecordStore: setState directly and getState', () => {
	familyStore.setState(2, { name: 'Jane Smith' });
	expect(familyStore.getState(2)).toStrictEqual({ name: 'Jane Smith' });
	familyStore.setState('father', { name: 'Jacob Smith' });
	expect(familyStore.getState('father')).toStrictEqual({ name: 'Jacob Smith' });
});

test('RecordStore: setState with function', () => {
	familyStore.setState(2, (current) => ({ name: current?.name + ' Smith' }));
	expect(familyStore.getState(2)).toStrictEqual({ name: 'Jane Smith Smith' });
	familyStore.setState('father', (current) => ({ name: current?.name + ' Smith' }));
	expect(familyStore.getState('father')).toStrictEqual({ name: 'Jacob Smith Smith' });
});

test('RecordStore: setState with non-existing key', () => {
	familyStore.setState(4, { name: 'John Smith' });
	expect(familyStore.getState(4)).toStrictEqual({ name: 'John Smith' });
	familyStore.setState('mother', { name: 'Jenny Smith' });
	expect(familyStore.getState('mother')).toStrictEqual({ name: 'Jenny Smith' });
});
