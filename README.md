[![npm version](https://badge.fury.io/js/livego.svg)](https://badge.fury.io/js/livego)

# LiveGO

Framework-agnostic LiveGo client with adapters for Vue, React, and more.

## Installation

```bash
npm install livego
```

## Quick Start

### Vue 3

```vue
<script setup lang="ts">
import { useLiveGo } from 'livego/vue';

const { state, mount, call, set, isLoading, error } = useLiveGo('Counter', { initial: 0 });

mount(); // Or use autoMount option
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <p>Count: {{ state.count }}</p>
    <button @click="call('increment')">+</button>
    <button @click="call('decrement')">-</button>
    <input 
      :value="state.count" 
      @input="set('count', Number($event.target.value))" 
      type="number"
    />
  </div>
</template>
```

### React

```tsx
import { useLiveGo } from 'livego/react';

function Counter() {
  const { state, call, set, isLoading, error } = useLiveGo(
    'Counter', 
    { initial: 0 },
    { autoMount: true }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => call('increment')}>+</button>
      <button onClick={() => call('decrement')}>-</button>
      <input 
        value={state.count} 
        onChange={(e) => set('count', Number(e.target.value))} 
        type="number"
      />
    </div>
  );
}
```

### Vanilla JavaScript

```typescript
import { LiveGoComponent } from 'livego';

// Mount a component
const counter = await LiveGoComponent.mount('Counter', { initial: 0 });

// Get state
console.log(counter.getState()); // { count: 0 }

// Subscribe to updates
const unsubscribe = counter.onUpdate((state, effects) => {
  console.log('New state:', state);
  document.getElementById('count').textContent = state.count;
});

// Call methods
await counter.call('increment');
await counter.call('decrement');

// Sync input
await counter.set('count', 42);

// Batch multiple operations
await counter.batch([
  { type: 'call', method: 'increment' },
  { type: 'call', method: 'increment' },
  { type: 'set', field: 'count', value: 100 }
]);

// Cleanup
unsubscribe();
```

## Configuration

### Global Configuration

Configure once for all components:

```typescript
import { configure } from 'livego';

configure({
  endpoint: 'https://api.example.com/livego',
  credentials: 'include',
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

Or configure individually:

```typescript
import { configureEndpoint, configureCredentials, configureHeaders } from 'livego';

configureEndpoint('https://api.example.com/livego');
configureCredentials('same-origin');
configureHeaders({ 'Authorization': 'Bearer token' });
```

### Per-Component Configuration

Override global settings per component:

```typescript
// Vue
const { state, mount } = useLiveGo('Counter', {}, {
  endpoint: 'https://different-api.com/livego',
  credentials: 'same-origin',
  headers: { 'X-API-Key': 'secret' }
});

// React
const { state } = useLiveGo('Counter', {}, {
  endpoint: 'https://different-api.com/livego',
  autoMount: true
});

// Vanilla
const counter = await LiveGoComponent.mount('Counter', {}, {
  endpoint: 'https://different-api.com/livego'
});
```

## API Reference

### Core API (`livego`)

#### `LiveGoComponent`

##### Static Methods

- `mount(componentName, props?, options?)` - Mount a component from the server
    - Returns: `Promise<LiveGoComponent>`
    - Example: `const comp = await LiveGoComponent.mount('Counter', { initial: 0 })`

##### Instance Methods

- `getState()` - Get current state
    - Returns: `Record<string, any>`

- `getId()` - Get component ID
    - Returns: `string`

- `getName()` - Get component name
    - Returns: `string`

- `getSnapshot()` - Get full snapshot (useful for debugging)
    - Returns: `ComponentSnapshot`

- `call(method, ...params)` - Call a server method
    - Returns: `Promise<void>`
    - Example: `await comp.call('increment')`

- `set(field, value)` - Sync an input field
    - Returns: `Promise<void>`
    - Example: `await comp.set('count', 42)`

- `batch(operations)` - Batch multiple operations
    - Returns: `Promise<void>`
    - Example: `await comp.batch([{ type: 'call', method: 'increment' }])`

- `onUpdate(callback)` - Subscribe to state updates
    - Returns: `() => void` (unsubscribe function)
    - Callback signature: `(state: any, effects: Effects) => void`

- `clearListeners()` - Remove all update listeners

#### Configuration Functions

- `configure(options)` - Configure all settings at once
- `configureEndpoint(endpoint)` - Set API endpoint
- `configureCredentials(credentials)` - Set fetch credentials mode
- `configureHeaders(headers)` - Set default headers
- `getEndpoint()` - Get current endpoint
- `getCredentials()` - Get current credentials mode
- `getHeaders()` - Get current headers

### Vue Composable (`livego/vue`)

#### `useLiveGo(componentName, props?, options?)`

Returns an object with:

- **state** (reactive) - Component state object
- **effects** (Ref) - Effects from last update
- **isMounted** (Ref) - Whether component is mounted
- **isLoading** (Ref) - Whether mount/update is in progress
- **error** (Ref) - Error object if any operation failed
- **mount()** - Function to mount the component
- **remount()** - Remount with same props
- **call(method, ...params)** - Call a server method
- **set(field, value)** - Sync an input field
- **batch(operations)** - Batch multiple operations
- **getSnapshot()** - Get current snapshot
- **getId()** - Get component ID
- **getName()** - Get component name

#### Options

```typescript
interface UseLiveGoOptions {
  endpoint?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  autoMount?: boolean; // Auto-mount on component creation
}
```

### React Hook (`livego/react`)

#### `useLiveGo(componentName, props?, options?)`

Returns an object with the same interface as Vue, but with React state values:

- **state** - Component state object
- **effects** - Effects from last update (or null)
- **isMounted** - Whether component is mounted
- **isLoading** - Whether mount/update is in progress
- **error** - Error object if any operation failed
- **mount()** - Function to mount the component
- **remount()** - Remount with same props
- **call(method, ...params)** - Call a server method
- **set(field, value)** - Sync an input field
- **batch(operations)** - Batch multiple operations
- **getSnapshot()** - Get current snapshot
- **getId()** - Get component ID
- **getName()** - Get component name

## Advanced Usage

### Auto-mounting

```typescript
// Vue - auto-mount immediately
const { state } = useLiveGo('Counter', { initial: 0 }, { autoMount: true });

// React - auto-mount on component mount
const { state } = useLiveGo('Counter', { initial: 0 }, { autoMount: true });
```

### Manual mounting with lifecycle control

```vue
<script setup>
import { useLiveGo } from 'livego/vue';
import { onMounted } from 'vue';

const { state, mount, isMounted } = useLiveGo('DataGrid', { pageSize: 50 });

onMounted(async () => {
  await mount();
  console.log('DataGrid mounted!');
});
</script>
```

### Error Handling

```typescript
const { call, error } = useLiveGo('Counter', {}, { autoMount: true });

async function increment() {
  try {
    await call('increment');
  } catch (err) {
    console.error('Failed to increment:', err);
    // error.value is also set automatically
  }
}
```

### Batch Operations

```typescript
const { batch } = useLiveGo('Form', {}, { autoMount: true });

// Send multiple operations in a single request
await batch([
  { type: 'set', field: 'firstName', value: 'John' },
  { type: 'set', field: 'lastName', value: 'Doe' },
  { type: 'call', method: 'validate' },
  { type: 'call', method: 'submit' }
]);
```

### Handling Effects

```typescript
const { effects } = useLiveGo('TodoList', {}, { autoMount: true });

watch(effects, (newEffects) => {
  if (newEffects?.redirects) {
    // Handle redirect
    window.location.href = newEffects.redirects;
  }
  
  if (newEffects?.html) {
    // Handle HTML updates
    document.getElementById('dynamic-content').innerHTML = newEffects.html;
  }
  
  if (newEffects?.dispatches && newEffects.dispatches.length > 0) {
    // Handle custom dispatches
    newEffects.dispatches.forEach(dispatch => {
      console.log('Dispatch:', dispatch);
    });
  }
});
```

### Custom Headers per Request

```typescript
// Set auth token per component
const { mount } = useLiveGo('SecureData', {}, {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

### Debugging

```typescript
const { getSnapshot, getId, getName } = useLiveGo('Counter', {}, { autoMount: true });

console.log('Component ID:', getId());
console.log('Component Name:', getName());
console.log('Full Snapshot:', getSnapshot());
```

## Type Definitions

```typescript
interface ComponentSnapshot {
  state: Record<string, any>;
  memo: ComponentMemo;
  checksum: string;
}

interface ComponentMemo {
  id: string;
  name: string;
  path: string;
  method: string;
  children: string[];
  data: Record<string, any>;
}

interface Effects {
  dirty: string[];
  dispatches: Record<string, any>[];
  redirects: string | null;
  html: string | null;
}

interface ErrorResponse {
  error: string;
  message: string;
  code: number;
  details?: Record<string, any>;
}
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Watch mode for development
npm run dev

# Type check
npm run typecheck
```

## Package Exports

The package provides multiple entry points:

```json
{
  ".": "livego",           // Core framework-agnostic client
  "./vue": "livego/vue",   // Vue 3 composable
  "./react": "livego/react" // React hook
}
```

Both CommonJS and ESM formats are supported.

## Browser Compatibility

- Modern browsers with ES2020 support
- Fetch API required
- No polyfills included

## License

MIT