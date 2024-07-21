## react-granular-store

A simple lightweight store for React that allows you to manage your state in a granular way, without the need to re-render the entire component tree.

### Basic usage

```tsx
import Store, { useStoreState } from 'react-granular-store';

const store = new Store({
  count: 0,
});

export const App = () => {
  const [count, setCount] = useStoreState(store, 'count');
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

The provided hooks subscribe to changes in the store and will only re-render the component when the state they are subscribed to changes. `useStoreState` is a drop-in replacement for React's `useState` hook.

### Options

The constructor takes an optional second argument with options:

```ts
interface StoreOptions {
  equalityFn?: (oldValue, newValue, key) => boolean;
  batchUpdates?: boolean;
}
```

#### equalityFn
A function that determines if the new value is equal to the old value. By default, it uses `oldValue === newValue`.

#### batchUpdates
The internal state is always changed synchronously. But if `batchUpdates` is set to true, the effects are batched and run only once at the end of the tick. This means that if you use a callback to set the state, the previous value provided as an argument will be consistent in between multiple set state calls. In the basic usage example above, if the `increment` function were called multiple times in quick succession, the `prev` value would correctly increment as expected. `batchUpdates` is set to `false` by default.

```
Note: If you are using this store exclusively with React components and the provided hooks, there is no need to batch the updates, as React will batch the internal calls to setState for you.
```

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

### Store#on(key, callback)

You can listen to changes on a specific key of the state by using the `on` method. The callback will be called whenever the key is updated.

```ts
const userStore = new Store<UserStoreState>({
  name: 'John Doe',
  age: 30,
});

userStore.on('name', (name) => {
  console.log(`Name changed to ${name}`);
});

userStore.setState('name', 'Jane Doe');

// Console: Name changed to Jane Doe
```

### Store#getState(key)

You can access the state directly by using the `getState` method. Even if `batchUpdates` is set to `true`, the value returned by `getState` will always be the latest value.

```
Note: Using this function inside a React component will not trigger a re-render when the state changes. Use the provided useStoreValue or useStoreState hooks to access the state instead.
```

### Store#setState(key, value)

You can update the state by using the `setState` method. The value can be a new value or a callback that receives the previous value and returns the new value.

```ts
userStore.setState('age', 31);

userStore.setState('age', (currentAge) => currentAge + 1);
```

### Store#off(key, callback)

You can remove a listener by using the `off` method. The callback will no longer be called when the key is updated.

### Store#subscribe(key, callback)

A shortcut for `on`. Returns a function that can be called to remove the listener.

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

### Gotchas

#### Using a function as the state value
If your type of state is a function, using a callback to update the state will not work as expected. If `setState` receives a function as the value, it will attempt to call it with the previous value as an argument, instead of saving that function as the new value. This limitation also exists in React's useState hook. As a workaround, you can use a function that returns a function.

```ts
const store = new Store({
  doSomething: () => {
	console.log('Doing something');
  },
});

store.setState('doSomething', () => {
  console.log('Doing something else');
});

// This will not work as expected

store.setState('doSomething', () => () => {
  console.log('Doing something else');
});

// This works because the return value is a function
```

#### 