import { createInterfaceApiRouter } from '../router.js';

/** Describes the Nucleum REST API for `apifn generate`; the service builds its own with services. */
export const router = createInterfaceApiRouter('nucleum');

export default router;
