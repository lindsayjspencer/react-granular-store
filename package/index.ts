import { Key, useCallback, useEffect, useState } from 'react';

export type StateTree = Record<string | number | symbol, any>;

export interface StoreOptions<State extends StateTree> {
	equalityFn?: <Key extends keyof State>(oldValue: State[Key], newValue: State[Key], key: Key) => boolean;
	batchUpdates?: boolean;
}

const defaultOptions: Required<StoreOptions<StateTree>> = {
	equalityFn: (oldValue, newValue) => oldValue === newValue,
	batchUpdates: false,
};

export type SetStateArgument<T> = T | ((prev: T) => T);
export default class Store<State extends StateTree> {
	public state: State;
	public options: Required<StoreOptions<State>>;

	constructor(defaultValues: State, options?: StoreOptions<State>) {
		this.state = defaultValues;
		this.options = { ...defaultOptions, ...options };
	}

	public callbacks: {
		[key in keyof State]?: Set<(newValue: State[key]) => void>;
	} = {};

	public on<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.add(callback);
		} else {
			this.callbacks[key] = new Set([callback]);
		}
	}

	public off<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.delete(callback);
		}
	}

	public getState<Key extends keyof State>(key: Key) {
		return this._deferredState.has(key) ? (this._deferredState.get(key) as State[Key]) : this.state[key];
	}

	private _setState<Key extends keyof State>(key: Key, newValue: State[Key]) {
		// determine equality and skip if equal
		const oldValue = this.state[key];
		if (this.options.equalityFn(oldValue, newValue, key)) {
			return;
		}
		this.state[key] = newValue;
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.forEach((callback) => callback(newValue));
		}
	}

	private _deferredState: Map<keyof State, State[keyof State]> = new Map();
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

	private awaitingUpdate = false;
	private _flagDeferredStateForResolution = () => {
		if (this.awaitingUpdate) return;
		this.awaitingUpdate = true;
		setTimeout(() => {
			this.resolveDeferredState();
			this.awaitingUpdate = false;
		}, 0);
	}

	public setState<Key extends keyof State>(key: Key, newValue: SetStateArgument<State[Key]>) {
		const resolvedValue = this._resolveNewValue(key, newValue);
		if (this.options.batchUpdates) {
			this._deferredState.set(key, resolvedValue);
			this._flagDeferredStateForResolution();
		} else {
			this._setState(key, resolvedValue);
		}
	}

	private resolveDeferredState() {
		// Cycle through the deferredState entries and set the state
		this._deferredState.forEach(<Key extends keyof State>(newValue: State[Key], key: Key) => {
			this._setState(key, newValue);
		});
		this._deferredState.clear();
	}

	public subscribe<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		this.on(key, callback);
		return () => this.off(key, callback);
	}
}

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
		if (!store) return;
		const unsubscribe = store.subscribe(key, setState);
		return () => unsubscribe();
	}, [store, key]);

	return state;
}

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

export interface RecordStoreState<T> {
	[key: string | number]: T | undefined;
}

export class RecordStore<T> extends Store<RecordStoreState<T>> {}