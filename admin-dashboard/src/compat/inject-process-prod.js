// injected as global process in prod builds
export default {
    env: {
        NODE_ENV: 'production',
    },
    nextTick: (f, ...args) => setTimeout(() => f(...args), 0),
};
