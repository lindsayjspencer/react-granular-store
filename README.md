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

A store can be declared and exported from anywhere in your app. Accessing and updating the state can be done from any component that has access to the store, or any scope that has access to the store instance.

The provided hooks subscribe to changes in the store and will only re-render the component when the state they are subscribed to changes. `useStoreState` is a drop-in replacement for React's `useState` hook.

## API

### Store(defaultValues, options)

The `Store` class manages the state and provides methods to access and update it. It requires an object with the initial state as the first argument. Each key of the object corresponds to a different piece of state. The types of the state are inferred from the initial state object, but an interface can optionally be declared and specified as a type argument.

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
The internal state is always changed synchronously. But if `batchUpdates` is set to `true`, the effects are batched and run only once at the end of the tick. This means that if you use a callback to set the state, the previous value provided as an argument will be consistent in between multiple set state calls. In the basic usage example above, if the `increment` function were called multiple times in quick succession, the `prev` value would correctly increment as expected. `batchUpdates` is set to `false` by default.

> Note: If you are using this store exclusively with React components and the provided hooks, there is no need to batch the updates as React will batch the internal calls to `setState` for you.

### Declaring a state interface

The types of the state are inferred from the initial state object. You can declare an interface for your state to get better type checking and autocompletion.

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

---
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

---

### Store#getState(key)

You can access the state directly by using the `getState` method. Even if `batchUpdates` is set to `true`, the value returned by `getState` will always be the latest value.

> Note: Using this function inside a React component will not trigger a re-render when the state changes. Use the provided `useStoreValue` or `useStoreState` hooks to access the state instead.

---

### Store#setState(key, value)

You can update the state by using the `setState` method. The value can be a new value or a callback that receives the previous value and returns the new value.

```ts
userStore.setState('age', 31);

userStore.setState('age', (currentAge) => currentAge + 1);
```

---

### Store#off(key, callback)

You can remove a listener by using the `off` method. The callback will no longer be called when the key is updated.

---

### Store#subscribe(key, callback)

A shortcut for `on`. Returns a function that can be called to remove the listener.

## Hooks

There are three provided hooks to access the state of a store in a React component. Their return values are strongly typed.

### useStoreState(store, key)

Returns a tuple with the value of the state and a function to update the state. It uses React's `useState` hook under the hood, so you can expect the same behavior.

```tsx
const userStore = new Store({
  name: 'John Doe',
  age: 30,
});

const [name, setName] = useStoreState(userStore, 'name');
```
In the example above, `name` will be `'John Doe'` and `setName` is a function that can be called to update the state. Similar to `useState` in React, `setName` can receive a new value or a callback that receives the previous value and returns the new value.

---

### useStoreValue(store, key)

Use this hook when you only need to access the value and don't need to update it. Changes to the state elsewhere in the app will cause the component to re-render.

```ts
const name = useStoreValue(userStore, 'name');
```

---

### useStoreUpdate(store, key)

Returns a function to update the state. This hook is useful when you only need to update the state and don't need to access the value. In particular, using this hook will prevent your component from re-rendering if the state changes.

```ts
const setName = useStoreUpdate(userStore, 'name');

setName('Jane Doe'); // valid
setName((prev) => prev + ' Jr.'); // also valid
```

---

### Nullable stores

If you can't be sure that your hook is consuming a store, all three hooks have an overload which accepts `Store | null` as the first argument. This might happen if your component accesses the store via a context, for example. If the store is typed as `Store | null`, the hooks will return `T | null`.

## Extend store class

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

### RecordStore&lt;T&gt;

`RecordStore` is a subclass of `Store` that provides a more convenient way to manage state where the keys are not known but the state type is always the same. It still provides type checking but the return type is `T | undefined` instead of `T`. The key type is always `string | number`.

It can be useful for managing a collection of items and subscribing to their updates.

```tsx
import { Store, RecordStore, useStoreValue } from 'react-granular-store';

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

## Runtime instantiation

You can instantiate a store at runtime. Here is a full example of how you might use a memoized store in a context.

```tsx
import Card from './Card';
import React, { useMemo, useContext } from 'react';
import Store, { useStoreState, useStoreValue, useStoreUpdate } from 'react-granular-store';

interface UserStoreState {
  name: string;
  age: number;
  occupation: string;
}

const StoreContext = React.createContext<Store<UserStoreState> | null>(null);

const UserCard = (props: UserStoreState) => {
  const store = useMemo(() => new Store<UserStoreState>(props), []);

  return (
  <StoreContext.Provider value={store}>
    <Card>
      <Header />
      <Body />
      <Footer />
    </Card>
  </StoreContext.Provider>
  );
};

// Use useStoreValue to access just the value of a piece of state
const Header = () => {
  const store = useContext(StoreContext);
  const name = useStoreValue(store, 'name');
  const age = useStoreValue(store, 'age');

  return (
    <div>
      <h1>{name} is {age} years old</h1>
    </div>
  );
};

const Body = () => {
  const store = useContext(StoreContext);
  const [name, setName] = useStoreState(store, 'name');
  const [occupation, setOccupation] = useStoreState(store, 'occupation');

  return (
  <div>
    <div>
      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />
    </div>
    <div>
      <label>Occupation</label>
      <input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
    </div>
  </div>
  );
};

// Use useStoreUpdate to access just the update function of a piece of state
const Footer = () => {
  const store = useContext(StoreContext);
  const updateAge = useStoreUpdate(store, 'age');

  return (
    <div>
      <button onClick={() => updateAge((prev) => prev + 1)}>Increment age</button>
    </div>
  );
};
```

## Gotchas

### Using a function as the state value
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

// This will not work as expected. This will cause the state to be set to undefined
// because all functions passed as the second argument will be run and this
// function implicitly returns undefined.

store.setState('doSomething', () => () => {
  console.log('Doing something else');
});

// This works because the return value is a function.
```