## react-granular-store

A simple lightweight store for React that allows you to manage your state in a granular way, without the need to re-render the entire component tree.

### Basic usage

```tsx
import Store, { useStoreState } from 'react-granular-store';

const store = new Store({
  count: 0,
});

export const useCount = () => useStoreState(store, 'count');

export const App = () => {
  const [count, setCount] = useCount();
  const increment = () => setCount((prev) => prev + 1);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={increment}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
};
```

A store can be declared and exported from anywhere in your app. Accessing and updating the state is done using the `useStoreState` hook, which takes the store instance and the key of the state you want to access.

Only components which access a key of the state through the provided hooks will update when that key is updated. This means you can have multiple components accessing different parts of the state, and only the components that use that part of the state will re-render when it changes.

### Options

The constructor takes an optional second argument with options:

```ts
interface StoreOptions {
  equalityFn?: (oldValue, newValue, key) => boolean;
  batchUpdates?: boolean;
}
```

- `equalityFn`: A function that determines if the new value is equal to the old value. By default, it uses `oldValue === newValue`.
- `batchUpdates`: If `true`, the state will be set asynchronously at the end of the current tick. If the state is set multiple times, the last value will be used. If a setState callback is used, the previous value will be consistent as the value won't actually change until the end of the current tick. When `false`, setting the state will run it's effects synchronously.

### Declaring a state interface

The types of the state are inferred from the initial state object, so you get autocompletion and type checking for free. You can declare an interface for your state to get better type checking and autocompletion.

```ts
interface UserStoreState {
  name?: string;
  age?: number;
}

const userStore = new Store<UserStoreState>({});

// Access state directly
const user = userStore.getState('name');
//    ^? string | undefined
```

### Extend store class

You can extend the `Store` class to add custom methods, properties and reactions to your store.

```ts
interface UserStoreState {
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
}

class CustomStore extends Store<UserStoreState> {
  constructor(defaults: UserStoreState) {
    super(defaults);

    this.on('firstName', this._formatFullName);
    this.on('lastName', this._formatFullName);
  }

  private _formatFullName() {
    const firstName = this.getState('firstName');
    const lastName = this.getState('lastName');
    this.setState('fullName', `${firstName} ${lastName}`);
  }

  incrementAge() {
    this.setState('age', (currentAge) => currentAge + 1);
  }
}
```

### Runtime instantiation

You can also instantiate a store at runtime, which can be useful if you need multiple instances of the same store. The component which instantiates the store will not re-render when the store is updated.

```tsx
import React, { useMemo, useContext } from 'react';
import Store, { useStoreState, useStoreValue, useStoreUpdate } from 'react-granular-store';

interface UserStoreState {
  name: string;
  age: number;
  occupation: string;
}

const StoreContext = React.createContext<Store<UserStoreState> | null>(null);

const App = () => {
  const store = useMemo(() => new Store<UserStoreState>({
    name: 'John Doe',
    age: 30,
    occupation: 'Software Engineer',
  }), []);

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
      <button onClick={() => updateAge((prev) => prev + 1)}>Increment age</button>
    </footer>
  );
};
```

### RecordStore&lt;T&gt;

`RecordStore` is a subclass of `Store` that provides a more convenient way to manage state where the keys are not known but the state type is always the same. It still provides type checking but the return type is `T | undefined` instead of `T`. The key type is always `string | number`.

It can be useful for managing a collection of items and subscribing to their updates.

```tsx
import { RecordStore, useStoreValue } from 'react-granular-store';

interface User {
  name: string;
  age: number;
}

interface UserState {
  john: User;
  mary: User;
}

// Using the regular Store class
const regularStore = new Store<UserState>({
  john: { name: 'John Doe', age: 30 },
  mary: { name: 'Mary Jane', age: 25 },
});

const john = regularStore.getState('john');
const mary = regularStore.getState('mary');
// These are of type User
const scott = regularStore.getState('scott');
// Type error: Argument of type '"scott"' is not assignable to parameter of type 'keyof UserState'.


// Using the RecordStore class
const recordStore = new RecordStore<User>({});

recordStore.setState('john', { name: 'John Doe', age: 30 });
recordStore.setState('mary', { name: 'Mary Jane', age: 25 });

const john = recordStore.getState('john');
const mary = recordStore.getState('mary');
const scott = recordStore.getState('scott');
// All of the above are of type User | undefined

// This component will only update when the user it's subscribed to changes
const UserDetails = ({ id }: { id: string }) => {
  const user = useStoreValue(recordStore, id);
  if (!user) return null;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.age}</p>
    </div>
  );
};
```