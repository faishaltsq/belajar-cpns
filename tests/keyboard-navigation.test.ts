import { describe, it, expect } from 'vitest';
import { mapKeyToAction } from '@/lib/examShortcuts';

describe('mapKeyToAction', () => {
  it('maps A-E keys to SELECT_OPTION 0-4', () => {
    expect(mapKeyToAction('a', 'KeyA')).toEqual({ type: 'SELECT_OPTION', index: 0 });
    expect(mapKeyToAction('B', 'KeyB')).toEqual({ type: 'SELECT_OPTION', index: 1 });
    expect(mapKeyToAction('c', 'KeyC')).toEqual({ type: 'SELECT_OPTION', index: 2 });
    expect(mapKeyToAction('d', 'KeyD')).toEqual({ type: 'SELECT_OPTION', index: 3 });
    expect(mapKeyToAction('e', 'KeyE')).toEqual({ type: 'SELECT_OPTION', index: 4 });
  });

  it('maps digit 1-5 to SELECT_OPTION 0-4', () => {
    expect(mapKeyToAction('1', 'Digit1')).toEqual({ type: 'SELECT_OPTION', index: 0 });
    expect(mapKeyToAction('5', 'Digit5')).toEqual({ type: 'SELECT_OPTION', index: 4 });
  });

  it('maps ArrowRight to NEXT_QUESTION', () => {
    expect(mapKeyToAction('ArrowRight', 'ArrowRight')).toEqual({ type: 'NEXT_QUESTION' });
  });

  it('maps ArrowLeft to PREV_QUESTION', () => {
    expect(mapKeyToAction('ArrowLeft', 'ArrowLeft')).toEqual({ type: 'PREV_QUESTION' });
  });

  it('maps R to TOGGLE_FLAG', () => {
    expect(mapKeyToAction('r', 'KeyR')).toEqual({ type: 'TOGGLE_FLAG' });
    expect(mapKeyToAction('R', 'KeyR')).toEqual({ type: 'TOGGLE_FLAG' });
  });

  it('returns null for unrelated keys', () => {
    expect(mapKeyToAction('Enter', 'Enter')).toBeNull();
    expect(mapKeyToAction(' ', 'Space')).toBeNull();
    expect(mapKeyToAction('Escape', 'Escape')).toBeNull();
  });
});
