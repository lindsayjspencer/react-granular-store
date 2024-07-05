import { Expect, Equal } from "type-testing";
import Store, { useStoreState, useStoreUpdate, useStoreValue } from "react-granular-store";

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
		Equal<
			typeof setCount,
			(newValue: (number) | ((oldValue: number) => number)) => void
		>
	>;
	const isolatedCount = useStoreValue(simpleStore, 'count');
	type TEST_REACT_STORE_USESTOREVALUE = Expect<Equal<typeof isolatedCount, number>>;
	const isolatedSetCount = useStoreUpdate(simpleStore, 'count');
	type TEST_REACT_STORE_USESTOREUPDATE = Expect<
		Equal<
			typeof isolatedSetCount,
			(newValue: (number) | ((oldValue: number) => number)) => void
		>
	>;

	const increment = () => {
		setCount((current) => {
			// The type of the current value should be number
			type TEST_REACT_STORE_SETSTATE = Expect<Equal<typeof current, number>>;
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
}

const getStore = () => {
	if (Math.random() > 0.5) {
		return simpleStore;
	}
	return null;
};

// Test with null store
const AppWithNullStore = () => {
	const store = getStore();
	const [count, setCount] = useStoreState(store, 'count');
	type TEST_REACT_STORE_USESTORESTATE_NULL_STATE = Expect<Equal<typeof count, number | null>>;
	type TEST_REACT_STORE_USESTORESTATE_NULL_SETSTATE = Expect<
		Equal<
			typeof setCount,
			(newValue: (number) | ((oldValue: number) => number)) => void
		>
	>;
	const isolatedCount = useStoreValue(store, 'count');
	type TEST_REACT_STORE_USESTOREVALUE_NULL = Expect<Equal<typeof isolatedCount, number | null>>;
	const isolatedSetCount = useStoreUpdate(store, 'count');
	type TEST_REACT_STORE_USESTOREUPDATE_NULL = Expect<
		Equal<
			typeof isolatedSetCount,
			(newValue: (number) | ((oldValue: number) => number)) => void
		>
	>;

	const increment = () => {
		setCount((current) => {
			// The type of the current value should be number | null
			type TEST_REACT_STORE_SETSTATE_NULL = Expect<Equal<typeof current, number>>;
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
}

