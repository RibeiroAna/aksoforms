import express from 'express';

import { bindMethod } from 'akso/workers/http/routing';

import { init as route$$org } from './$org';

import method$get from './get';

/**
 * Sets up /codeholders/{codeholderId}/delegations
 * @return {express.Router}
 */
export function init () {
	const router = new express.Router({ mergeParams: true });

	router.use('/:org', route$$org());

	bindMethod(router, '/', 'get', method$get);

	return router;
}
