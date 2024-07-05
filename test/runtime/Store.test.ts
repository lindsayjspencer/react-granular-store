import { assert, expect, test } from 'vitest';
import Store, { RecordStore } from 'react-granular-store';

const simpleStore = new Store({
	count: 0,
	name: 'John Doe',
});

test('SimpleStore: getState with initial values', () => {
	expect(simpleStore.getState('count')).toBe(0);
	expect(simpleStore.getState('name')).toBe('John Doe');
});

test('SimpleStore: setState directly and getState', () => {
	simpleStore.setState('count', 1);
	expect(simpleStore.getState('count')).toBe(1);
	simpleStore.setState('name', 'Jane Doe');
	expect(simpleStore.getState('name')).toBe('Jane Doe');
});

test('SimpleStore: setState with function', () => {
	simpleStore.setState('count', (current) => current + 1);
	expect(simpleStore.getState('count')).toBe(2);
	simpleStore.setState('name', (current) => current + ' Doe');
	expect(simpleStore.getState('name')).toBe('Jane Doe Doe');
});

const recordStore = new RecordStore<{ name: string }>({
	1: { name: 'John Doe' },
	2: { name: 'Jane Doe' },
	3: { name: 'John Smith' },
	father: { name: 'Jacob Doe' },
	mother: { name: 'Jenny Doe' },
});

test('RecordStore: getState with initial values', () => {
	expect(recordStore.getState(2)).toStrictEqual({ name: 'Jane Doe' });
	expect(recordStore.getState('father')).toStrictEqual({ name: 'Jacob Doe' });
});

test('RecordStore: getState with non-existing key', () => {
	expect(recordStore.getState(4)).toBeUndefined();
	expect(recordStore.getState('non-existing')).toBeUndefined();
});

test('RecordStore: setState directly and getState', () => {
	recordStore.setState(2, { name: 'Jane Smith' });
	expect(recordStore.getState(2)).toStrictEqual({ name: 'Jane Smith' });
	recordStore.setState('father', { name: 'Jacob Smith' });
	expect(recordStore.getState('father')).toStrictEqual({ name: 'Jacob Smith' });
});

test('RecordStore: setState with function', () => {
	recordStore.setState(2, (current) => ({ name: current?.name + ' Smith' }));
	expect(recordStore.getState(2)).toStrictEqual({ name: 'Jane Smith Smith' });
	recordStore.setState('father', (current) => ({ name: current?.name + ' Smith' }));
	expect(recordStore.getState('father')).toStrictEqual({ name: 'Jacob Smith Smith' });
});

test('RecordStore: setState with non-existing key', () => {
	recordStore.setState(4, { name: 'John Smith' });
	expect(recordStore.getState(4)).toStrictEqual({ name: 'John Smith' });
	recordStore.setState('mother', { name: 'Jenny Smith' });
	expect(recordStore.getState('mother')).toStrictEqual({ name: 'Jenny Smith' });
});