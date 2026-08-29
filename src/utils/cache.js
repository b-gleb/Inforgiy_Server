import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300 // 5 min
});

export const shortTTL = 60; // 1 min
export const longTTL = 3600; // 1 hr

export default cache;
