import { useCallback, useEffect, useState } from 'react';

// Why any? Unknown is not appropriate here because we dont want to have to determine the type of the state when we access it.
// By using any, we can quietly cast the state to the correct type when we access it. The type is still inferred correctly,
// but we need this value in the state tree to be completely unconstrained.
export type StateTree = Record<string | number | symbol, any>;

export interface StoreOptions<State extends StateTree> {
	// Let the consumer custom configure equality checks
	equalityFn?: <Key extends keyof State>(oldValue: State[Key], newValue: State[Key], key: Key) => boolean;
	// Run callbacks to state updates synchronously or batch them
	batchUpdates?: boolean;
}

const defaultOptions: Required<StoreOptions<StateTree>> = {
	equalityFn: (oldValue, newValue) => oldValue === newValue,
	batchUpdates: false,
};

// Equivalent to React's SetStateAction
export type SetStateArgument<T> = T | ((prev: T) => T);

// Main store class
export default class Store<State extends StateTree> {
	// The state is public so that it can be accessed directly if needed. Not recommended.
	public state: State;
	public options: Required<StoreOptions<State>>;
	// Callbacks are stored as keys in an object to get full inference support. Initially a map was used, but it's difficult
	// to use generics to link the key of the map to the value being returned from the map when you use the getter.
	public callbacks: {
		[key in keyof State]?: Set<(newValue: State[key]) => void>;
	} = {};

	// Deferred state is used to batch updates. When setState is called, the state is not updated immediately, but instead
	// stored in the deferredState map. When the batch is resolved, the deferredState is cycled through and the state is
	// updated.
	private _deferredState: Map<keyof State, State[keyof State]> = new Map();
	// This flag is used to prevent multiple setTimeouts from being set when a batch update is already pending.
	private _awaitingUpdate = false;

	// Using the generic as the type of defaultValues is the magic that allows the state to be inferred correctly. This is
	// overridden by providing the generic directly when instantiating.
	constructor(defaultValues: State, options?: StoreOptions<State>) {
		this.state = defaultValues;
		// Let the default options be overridden by the provided options
		this.options = { ...defaultOptions, ...options };
	}

	// Get the state for a key. If running in batch mode (default), the accurate state will be in the deferredState map.
	public getState<Key extends keyof State>(key: Key) {
		return this._deferredState.has(key) ? (this._deferredState.get(key) as State[Key]) : this.state[key];
	}

	// Set the state for a key. If running in batch mode (default), the state is not updated immediately, but stored in
	// the deferredState map. When the batch is resolved, the deferredState is cycled through and the state is updated.
	public setState<Key extends keyof State>(key: Key, newValue: SetStateArgument<State[Key]>) {
		const resolvedValue = this._resolveNewValue(key, newValue);
		if (this.options.batchUpdates) {
			this._deferredState.set(key, resolvedValue);
			this._flagDeferredStateForResolution();
		} else {
			this._setState(key, resolvedValue);
		}
	}

	// Low level (but public) function to register a callback for a key
	public on<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.add(callback);
		} else {
			this.callbacks[key] = new Set([callback]);
		}
	}

	// Low level (but public) function to remove a callback for a key. Note: callbacks are not removed unless they are
	// an exact reference match.
	public off<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.delete(callback);
		}
	}

	// Subscribe to a key. This function returns a function that can be called to unsubscribe the callback.
	public subscribe<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		this.on(key, callback);
		return () => this.off(key, callback);
	}

	// Set the main internal state. This is the core function that sets the state and triggers callbacks. This is also where
	// the equality function is used to determine if the state has changed.
	private _setState<Key extends keyof State>(key: Key, newValue: State[Key]) {
		// determine equality and skip if equal
		const oldValue = this.state[key];
		if (this.options.equalityFn(oldValue, newValue, key)) {
			return;
		}
		// All these checks before finally setting the state here
		this.state[key] = newValue;
		// Call all the callbacks for this key
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.forEach((callback) => callback(newValue));
		}
	}

	// This function is to determine the new value of the state given the SetStateArgument, which could be a function. If it's a
	// function, it's called with the previous value, which needs to potentially come from deferred state if in batch mode (default).
	private _resolveNewValue<Key extends keyof State>(key: Key, newValue: SetStateArgument<State[Key]>) {
		if (typeof newValue === 'function') {
			const prevValue = this.getState(key);
			// newValue has to be cast to a function because there's no way of knowing if the actual state type is a function.
			// This is a limitation that also exists in React useState. If you need to set a function as state, you have to wrap
			// it in a function that returns it.
			return (newValue as (prev: State[Key]) => State[Key])(prevValue);
		}
		return newValue;
	}

	// This function is used to batch updates. It sets a timeout to resolve the deferred state in the next tick. If a
	// batch is already pending, it does nothing.
	private _flagDeferredStateForResolution = () => {
		if (this._awaitingUpdate) return;
		this._awaitingUpdate = true;
		setTimeout(() => {
			this._resolveDeferredState();
			this._awaitingUpdate = false;
		}, 0);
	};

	// This function is used to resolve the deferred state at the end of the tick in batch mode. It cycles through the
	// deferredState entries and sets the state.
	private _resolveDeferredState() {
		// Cycle through the deferredState entries and set the state
		this._deferredState.forEach(<Key extends keyof State>(newValue: State[Key], key: Key) => {
			this._setState(key, newValue);
		});
		this._deferredState.clear();
	}
}

// This hook subscribes to a store and syncs the state with a react useState hook. It returns the current state and
// unsubscribes when the component unmounts. There is an overload to return alternate types if the store is possibly
// null. This is useful for when the store is being passed in as a prop or through a context.
export function useStoreValue<State extends StateTree, Key extends keyof State>(
	store: Store<State>,
	key: Key,
): State[Key];
export function useStoreValue<State extends StateTree, Key extends keyof State>(
	store: Store<State> | null,
	key: Key,
): State[Key] | null;
export function useStoreValue<State extends StateTree, Key extends keyof State>(store: Store<State> | null, key: Key) {
	const [state, setState] = useState(store?.getState(key) ?? null);

	useEffect(() => {
		if (!store) {
			setState(null);
			return;
		}
		// Set the initial state
		setState(store.getState(key));
		// Subscribe to the store for updates
		const unsubscribe = store.subscribe(key, setState);
		return () => unsubscribe();
	}, [store, key]);

	return state;
}

// This hook subscribes to a store and returns a function that can be called to update the state. This hook does not
// react to the state changing, and so is useful for a component that needs to alter state but doesn't read it. There is
// also an overload to return alternate types if the store is possibly null. This is useful for when the store is being
// passed in as a prop or through a context.
export function useStoreUpdate<State extends StateTree, Key extends keyof State>(
	store: Store<State>,
	key: Key,
): (newValue: SetStateArgument<State[Key]>) => void;
export function useStoreUpdate<State extends StateTree, Key extends keyof State>(
	store: Store<State> | null,
	key: Key,
): (newValue: SetStateArgument<State[Key]>) => void;
export function useStoreUpdate<State extends StateTree, Key extends keyof State>(store: Store<State> | null, key: Key) {
	return useCallback(
		(newValue: SetStateArgument<State[Key]>) => {
			if (!store) return;
			store.setState(key, newValue);
		},
		[store, key],
	);
}

// This hook combines the useStoreValue and useStoreUpdate hooks to return the current state and a function to update the
// state. This is useful for components that need to read and update the state. There is also an overload to return
// alternate types if the store is possibly null. This is useful for when the store is being passed in as a prop or
// through a context.
export function useStoreState<State extends StateTree, Key extends keyof State>(
	store: Store<State>,
	key: Key,
): [State[Key], (newValue: SetStateArgument<State[Key]>) => void];
export function useStoreState<State extends StateTree, Key extends keyof State>(
	store: Store<State> | null,
	key: Key,
): [State[Key] | null, (newValue: SetStateArgument<State[Key]>) => void];
export function useStoreState<State extends StateTree, Key extends keyof State>(store: Store<State> | null, key: Key) {
	const state = useStoreValue(store, key);
	const updateState = useStoreUpdate(store, key);

	return [state, updateState] as const;
}

// Record stores are a special case of stores where the value of each key is of the same type. Additionally, you can
// try to access keys that are not explicitly specified because any regular key will match this record type. The only
// caveat of this approach is that all keys, including ones that definitely exist, return the value as possibly
// undefined.

// An example use case for a RecordStore is a list of items where the key is the id of the item. You can access any
// item by id, and if the item doesn't exist, you get undefined. Components can now subscribe to the ID of something
// and get the item, even if it doesn't exist yet. And when it does exist, the component will update.

// You can think of a RecordStore like a Map, but with the ability to subscribe to keys and get updates when they change.

// The state of the RecordStore is similar to the state tree, but because we know the value types are all the same, we
// can use a generic to provide the value rather than using any.
export interface RecordStoreState<T> {
	[key: string | number | symbol]: T | undefined;
}

// A RecordStore is nothing but an extended Store with a specific type for the state tree. The generic type can be
// inferred from the default value provided when instantiating the store.
export class RecordStore<T> extends Store<RecordStoreState<T>> {}
