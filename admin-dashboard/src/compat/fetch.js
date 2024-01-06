//! This file is a replacement for the cross-fetch module.
//! We don’t actually need cross-fetch because all supported browsers have the API out of the box.
//! Additionally, cross-fetch’s feature detection is mildly broken in web workers and their XHR
//! polyfill seems to have minor problems.

export default global.fetch.bind(global);
export const Headers = global.Headers;
