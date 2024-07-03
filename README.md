## react-granular-store

A simple lightweight store for React that allows you to manage your state in a granular way, without the need to re-render the entire component tree.

### Basic usage

```tsx
import Store, { useStoreState } from 'react-granular-store';

const store = new Store({
  count: 0,
  user: {
	name: 'John Doe',
	age: 30,
  },
});

const App = () => {
  const [count, setCount] = useStoreState(store, 'count');
  const [user, setUser] = useStoreState(store, 'user');

  return (
	<div>
	  <h1>{count}</h1>
	  <button onClick={() => setCount(count + 1)}>Increment</button>
	  <h2>{user.name}</h2>
	  <h3>{user.age}</h3>
	  <button onClick={() => setUser({ ...user, age: user.age + 1 })}>
		Increment age
	  </button>
	</div>
  );
};
```

A store can be declared and exported from anywhere in your app. Accessing and updating the state is done using the `useStoreState` hook, which takes the store instance and the key of the state you want to access.

Only components which access a key of the state through the provided hooks will update when that key is updated. This means you can have multiple components accessing different parts of the state, and only the components that use that part of the state will re-render when it changes.

By default the effects of updating are run synchronously, although `React` will usually batch the resulting re-rendering of other components. If you have custom reactions to state changes that you want to run asynchronously, you can set the `batchUpdates` option to `true` when creating the store.

### Declaring a state interface

The types of the state are inferred from the initial state object, so you get autocompletion and type checking for free. You can declare an interface for your state to get better type checking and autocompletion.

```tsx
interface UserStoreState {
  name?: string;
  age?: number;
}

const userStore = new Store<UserStoreState>();

// Access state directly
const user = userStore.getState('name');
//    ^? string | undefined
```

### Extend store class

You can extend the `Store` class to add custom methods and properties to your store.

```tsx
interface UserStoreState {
  name: string;
  age: number;
}

class CustomStore extends Store<UserStoreState> {
  constructor(defaults: UserStoreState) {
	super(defaults);
  }

  incrementCount() {
	const currentState = this.getState('count');
	this.setState('count', currentState + 1);
  }
}
```

### Runtime instantiation

You can also instantiate a store at runtime, which can be useful if you need multiple instances of the same store. The component which instantiates the store does not need to re-render when the store is updated.

```tsx
import React, { useMemo, useContext } from 'react';
import Store, { useStoreState, useStoreValue, useStoreUpdate } from 'react-granular-store';

interface UserStoreState {
  name?: string;
  age?: number;
  occupation?: string;
}

const StoreContext = React.createContext<Store<UserStoreState> | null>(null);

const App = () => {
  const store = useMemo(() => new Store<UserStoreState>(), []);

  return (
	<StoreContext.Provider value={store}>
		<Header />
		<Body />
		<Footer />
	</StoreContext.Provider>
  );
};

// Use useStoreValue to access just the value of a piece of state
const Header = () => {
  const store = useContext(StoreContext);
  const name = useStoreValue(store, 'name');
  const age = useStoreValue(store, 'age');

  return (
	<header>
	  <h1>{name} is {age} years old</h1>
	</header>
  );
};

const Body = () => {
  const store = useContext(StoreContext);
  const [name, setName] = useStoreState(store, 'name');
  const [occupation, setOccupation] = useStoreState(store, 'occupation');

  return (
	<main>
		<div>
			<label>Name</label>
			<input value={name} onChange={(e) => setName(e.target.value)} />
		</div>
		<div>
			<label>Occupation</label>
			<input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
		</div>
	</main>
  );
};

// Use useStoreUpdate to access just the update function of a piece of state
const Footer = () => {
  const store = useContext(StoreContext);
  const updateAge = useStoreUpdate(store, 'age');

  return (
	<footer>
		<button onClick={() => updateAge(25)}>Make me 25</button>
	</footer>
  );
};
```

### Options

The constructor takes an optional second argument with options:

```tsx
interface StoreOptions {
	equalityFn?: (oldValue, newValue, key) => boolean;
	batchUpdates?: boolean;
}
```

- `equalityFn`: A function that determines if the new value is equal to the old value. By default, it uses `oldValue === newValue`.
- `batchUpdates`: If `true`, the component will only re-render once if multiple state updates are made in the same tick. Defaults to `false`. This means setting the state will run it's effects synchronously.