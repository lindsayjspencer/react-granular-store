import { useCallback, useEffect, useState } from 'react';

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
	private newState: {
		[key in keyof State]?: State[key];
	} = {};
	private awaitingUpdate = false;
	protected options = defaultOptions;

	constructor(defaultValues: State, options?: StoreOptions<State>) {
		this.state = defaultValues;
		this.options = { ...this.options, ...options };
	}

	public callbacks: {
		[key in keyof State]?: Set<(newValue: State[key]) => void>;
	} = {};

	protected on<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.add(callback);
		} else {
			this.callbacks[key] = new Set([callback]);
		}
	}

	protected off<Key extends keyof State>(key: Key, callback: (newValue: State[Key]) => void) {
		const existingCallbacks = this.callbacks[key];
		if (existingCallbacks) {
			existingCallbacks.delete(callback);
		}
	}

	public getState<Key extends keyof State>(key: Key) {
		return this.state[key];
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

	private _resolveNewValue<Key extends keyof State>(key: Key, newValue: SetStateArgument<State[Key]>, prevValue: State[Key]) {
		if (typeof newValue === 'function') {
			return (newValue as (prev: State[Key]) => State[Key])(prevValue);
		}
		return newValue;
	}

	private keyExistsInNewState<Key extends keyof State, NewState extends State>(state: NewState[Key] | undefined, key: Key): state is NewState[Key] {
		return this.newState.hasOwnProperty(key);
	}

	public setState<Key extends keyof State>(key: Key, newValue: SetStateArgument<State[Key]>) {
		if (this.options.batchUpdates) {
			const existingValue = this.newState[key];
			// Really difficult to figure out a way to get these types to work. Key issue is that if the newState has a property set for
			// this key, then it has already been resolved and we should use that value instead of the current state value for any further
			// resolving. But the value of the property could still be undefined, so checking if it's undefined is not enough. So we need
			// to pull out the value first and then use a type guard to tell TS that the value is not State[Key] | undefined. It was
			// difficult to write the following if statement efficiently.
			if (this.keyExistsInNewState(existingValue, key)) {
				const resolvedValue = this._resolveNewValue(key, newValue, existingValue);
				this.newState[key] = resolvedValue;
			} else {
				const resolvedValue = this._resolveNewValue(key, newValue, this.getState(key));
				this.newState[key] = resolvedValue;
			}
			if (!this.awaitingUpdate) {
				this.awaitingUpdate = true;
				setTimeout(() => {
					this.processNewState();
					this.awaitingUpdate = false;
				}, 0);
			}
		} else {
			const resolvedValue = this._resolveNewValue(key, newValue, this.getState(key));
			this._setState(key, resolvedValue);
		}
	}

	private processNewState() {
		// Cycle through the newState entries and set the state
		Object.entries(this.newState).forEach(([key, newValue]) => {
			this._setState(key as keyof State, newValue as State[keyof State]);
		});
		this.newState = {};
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