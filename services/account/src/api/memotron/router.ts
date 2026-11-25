import { createInterfaceApiRouter } from '../router.js';

/** Describes the Memotron REST API for `apifn generate`; the service builds its own with services. */
export const router = createInterfaceApiRouter('memotron');

export default router;
