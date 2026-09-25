import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLastTypeId, newTemplateHref, setLastTypeId } from './last-type';

const KEY = 'wm_last_type_id';

function mockLocalStorage(initial: Record<string, string> = {}) {
  let store: Record<string, string> = { ...initial };
  const api = {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _dump: () => ({ ...store }),
  };
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', api);
  return api;
}

beforeEach(() => {
  mockLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLastTypeId', () => {
  it('null sin window (SSR)', () => {
    vi.unstubAllGlobals();
    expect(getLastTypeId()).toBeNull();
  });

  it('null si no hay nada guardado', () => {
    expect(getLastTypeId()).toBeNull();
  });

  it('devuelve el id guardado', () => {
    localStorage.setItem(KEY, '3');
    expect(getLastTypeId()).toBe(3);
  });

  it('null con valores inválidos (0, negativo, texto)', () => {
    localStorage.setItem(KEY, '0');
    expect(getLastTypeId()).toBeNull();
    localStorage.setItem(KEY, '-2');
    expect(getLastTypeId()).toBeNull();
    localStorage.setItem(KEY, 'abc');
    expect(getLastTypeId()).toBeNull();
    localStorage.setItem(KEY, '');
    expect(getLastTypeId()).toBeNull();
  });
});

describe('setLastTypeId', () => {
  it('guarda ids válidos como string', () => {
    setLastTypeId(5);
    expect(localStorage.getItem(KEY)).toBe('5');
  });

  it('ignora ids inválidos sin escribir', () => {
    setLastTypeId(0);
    setLastTypeId(-1);
    setLastTypeId(NaN);
    setLastTypeId(1.5);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('no revienta si localStorage lanza (modo privado)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('denied');
      },
    });
    expect(() => setLastTypeId(2)).not.toThrow();
  });

  it('no hace nada sin window (SSR)', () => {
    vi.unstubAllGlobals();
    expect(() => setLastTypeId(2)).not.toThrow();
  });
});

describe('newTemplateHref', () => {
  it('sin último tipo → URL sin typeId', () => {
    expect(newTemplateHref()).toBe('/workouts/log?mode=new-template');
  });

  it('con último tipo → URL con typeId', () => {
    localStorage.setItem(KEY, '7');
    expect(newTemplateHref()).toBe('/workouts/log?mode=new-template&typeId=7');
  });

  it('roundtrip set → href', () => {
    setLastTypeId(4);
    expect(newTemplateHref()).toBe('/workouts/log?mode=new-template&typeId=4');
  });
});
