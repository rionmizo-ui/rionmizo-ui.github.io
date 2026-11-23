// util.js — 状態を持たない小さな道具
import L from '../logic/index.js';

export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = p => p * p * (3 - 2 * p);
export const cause = id => L.CAUSES.find(c => c.id === id) || { id, name: id, kind: 'sudden', float: 'float' };
