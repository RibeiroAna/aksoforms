// injected as global process in dev builds
export default {
    env: {
        NODE_ENV: 'development',
    },
    nextTick: (f, ...args) => setTimeout(() => f(...args), 0),
};
