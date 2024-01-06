import express from 'express';

import { bindMethod } from 'akso/workers/http/routing';

import { init as route$addons } from './addons';
import { init as route$methods } from './methods';

import method$get from './get';
import method$delete from './delete';
import method$patch from './patch';

/**
 * Sets up /aksopay/payment_orgs/{paymentOrgId}
 * @return {express.Router}
 */
export function init () {
	const router = new express.Router({ mergeParams: true });

	router.use('/addons', route$addons());
	router.use('/methods', route$methods());

	bindMethod(router, '/', 'get', method$get);
	bindMethod(router, '/', 'delete', method$delete);
	bindMethod(router, '/', 'patch', method$patch);

	return router;
}
