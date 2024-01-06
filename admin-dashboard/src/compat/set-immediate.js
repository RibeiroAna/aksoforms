// polyfill for setImmediate
export default f => setTimeout(f, 0);
