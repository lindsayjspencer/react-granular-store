import { expect, test } from 'vitest';
import { Expect, Equal } from 'type-testing';
import Store, { useStoreState, useStoreUpdate, useStoreValue } from 'react-granular-store';

type ExtendedStoreState = {
	data?: string;
	isLoading: boolean;
	lastUpdated: Date;
};

class ExtendedStore extends Store<ExtendedStoreState> {
	constructor() {
		super({
			isLoading: false,
			lastUpdated: new Date(),
		});

		this.on('data', (data) => {
			type TEST_STORE_ON_STRING = Expect<Equal<typeof data, string | undefined>>;
			this.setState('lastUpdated', new Date());
		});

		this.on('isLoading', (isLoading) => {
			type TEST_STORE_ON_BOOLEAN = Expect<Equal<typeof isLoading, boolean>>;
		});

		this.on('lastUpdated', (lastUpdated) => {
			type TEST_STORE_ON_DATE = Expect<Equal<typeof lastUpdated, Date>>;
		});
	}

	public updateData = (data: string) => {
		this.setState('data', data);
	};
}

const extendedStore = new ExtendedStore();

// Test Store
const simpleStore = new Store({
	count: 0,
	name: 'John Doe',
});

// Store.setState should accept a number
simpleStore.setState('count', 0);

// Store.setState should not accept a string
// @ts-expect-error
simpleStore.setState('count', 'something');

// Store.setState should accept a string
simpleStore.setState('name', 'Jane Doe');

// Store.setState should not accept a number
// @ts-expect-error
simpleStore.setState('name', 42);

// Store.setState should error if the key is not in the store
// @ts-expect-error
simpleStore.setState('notInStore', 'something');

// Store.setState should accept a function, and the type of the current value
// should be number
simpleStore.setState('count', (current) => {
	type TEST_STORE_SETSTATE = Expect<Equal<typeof current, number>>;
	return current + 1;
});

// Store.setState should not accept a function that returns a string
// @ts-expect-error
simpleStore.setState('count', () => {
	return 'something';
});

// Store.setState should return void
const shouldBeVoid = simpleStore.setState('count', 0);
type TEST_STORE_SETSTATE_VOID = Expect<Equal<typeof shouldBeVoid, void>>;

// Store.getState should return number
const count = simpleStore.getState('count');
type TEST_STORE_GETSTATE = Expect<Equal<typeof count, number>>;

// RecordStore.getState should error if the key is not in the store
// @ts-expect-error
const notInStore = simpleStore.getState('notInStore');

// React component testing
const App = () => {
	const [count, setCount] = useStoreState(simpleStore, 'count');
	type TEST_REACT_STORE_USESTORESTATE_STATE = Expect<Equal<typeof count, number>>;
	type TEST_REACT_STORE_USESTORESTATE_SETSTATE = Expect<
		Equal<typeof setCount, (newValue: number | ((oldValue: number) => number)) => void>
	>;
	const isolatedCount = useStoreValue(simpleStore, 'count');
	type TEST_REACT_STORE_USESTOREVALUE = Expect<Equal<typeof isolatedCount, number>>;
	const isolatedSetCount = useStoreUpdate(simpleStore, 'count');
	type TEST_REACT_STORE_USESTOREUPDATE = Expect<
		Equal<typeof isolatedSetCount, (newValue: number | ((oldValue: number) => number)) => void>
	>;

	const increment = () => {
		setCount((current) => {
			// The type of the current value should be number
			type TEST_REACT_STORE_SETSTATE = Expect<Equal<typeof current, number>>;
			return (current ?? 0) + 1;
		});
	};

	// @ts-expect-error - should error because 'type' is not in the store
	const type = useStoreValue(extendedStore, 'type');

	const lastUpdated = useStoreValue(extendedStore, 'lastUpdated');
	type TEST_REACT_STORE_USESTOREVALUE_EXTENDED = Expect<Equal<typeof lastUpdated, Date>>;

	const [isLoading, setIsLoading] = useStoreState(extendedStore, 'isLoading');
	type TEST_REACT_STORE_USESTORESTATE_EXTENDED_STATE = Expect<Equal<typeof isLoading, boolean>>;

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
		return simpleStore;
	}
	return null;
};

const getExtendedStore = () => {
	if (Math.random() > 0.5) {
		return extendedStore;
	}
	return null;
};

// Test with null store
const AppWithNullStore = () => {
	const store = getStore();
	const [count, setCount] = useStoreState(store, 'count');
	type TEST_REACT_STORE_USESTORESTATE_NULL_STATE = Expect<Equal<typeof count, number | null>>;
	type TEST_REACT_STORE_USESTORESTATE_NULL_SETSTATE = Expect<
		Equal<typeof setCount, (newValue: number | ((oldValue: number) => number)) => void>
	>;
	const isolatedCount = useStoreValue(store, 'count');
	type TEST_REACT_STORE_USESTOREVALUE_NULL = Expect<Equal<typeof isolatedCount, number | null>>;
	const isolatedSetCount = useStoreUpdate(store, 'count');
	type TEST_REACT_STORE_USESTOREUPDATE_NULL = Expect<
		Equal<typeof isolatedSetCount, (newValue: number | ((oldValue: number) => number)) => void>
	>;

	const increment = () => {
		setCount((current) => {
			// The type of the current value should be number | null
			type TEST_REACT_STORE_SETSTATE_NULL = Expect<Equal<typeof current, number>>;
			return (current ?? 0) + 1;
		});
	};

	const extended = getExtendedStore();
	// @ts-expect-error - should error because 'type' is not in the store
	const type = useStoreValue(extended, 'type');

	const lastUpdated = useStoreValue(extended, 'lastUpdated');
	type TEST_REACT_STORE_USESTOREVALUE_EXTENDED = Expect<Equal<typeof lastUpdated, Date | null>>;

	const [isLoading, setIsLoading] = useStoreState(extended, 'isLoading');
	type TEST_REACT_STORE_USESTORESTATE_EXTENDED_STATE = Expect<Equal<typeof isLoading, boolean | null>>;

	return (
		<div>
			<button onClick={increment}>Increment</button>
			<p>Count: {count}</p>
			<p>Isolated count: {isolatedCount}</p>
			<button onClick={() => isolatedSetCount((current) => (current ?? 0) + 1)}>Increment isolated</button>
		</div>
	);
};

const store = new Store({
	count: 0,
	name: 'John Doe',
});

test('Store: getState with initial values', () => {
	expect(store.getState('count')).toBe(0);
	expect(store.getState('name')).toBe('John Doe');
});

test('Store: setState directly and getState', () => {
	store.setState('count', 1);
	expect(store.getState('count')).toBe(1);
	store.setState('name', 'Jane Doe');
	expect(store.getState('name')).toBe('Jane Doe');
});

test('Store: setState with function', () => {
	store.setState('count', (current) => current + 1);
	expect(store.getState('count')).toBe(2);
	store.setState('name', (current) => current + ' Doe');
	expect(store.getState('name')).toBe('Jane Doe Doe');
});

const batchedStore = new Store(
	{
		count: 0,
		name: 'John Doe',
	},
	{
		batchUpdates: true,
	},
);

test('Store: batched setState', async () => {
	batchedStore.on('count', (count) => {
		expect(count).toBe(2);
	});
	batchedStore.setState('count', (current) => {
		expect(current).toBe(0);
		return 1;
	});
	expect(batchedStore.getState('count')).toBe(1);
	batchedStore.setState('count', (current) => {
		expect(current).toBe(1);
		return 2;
	});
	expect(batchedStore.getState('count')).toBe(2);

	await new Promise((resolve) => setTimeout(resolve, 0));
});

test('Store: batched setState never calls on', async () => {
	batchedStore.on('count', () => {
		throw new Error('on should not be called');
	});
	batchedStore.setState('count', (current) => {
		expect(current).toBe(2);
		return 0;
	});
	batchedStore.setState('count', (current) => {
		expect(current).toBe(0);
		return 2;
	});

	await new Promise((resolve) => setTimeout(resolve, 0));
});
