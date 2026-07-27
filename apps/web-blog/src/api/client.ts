import createClient from 'openapi-fetch';
import type { paths } from './__generated__/api';
import { tokenStorage } from '@/lib/http/tokenStorage';
import { createTokenInjector } from '@/lib/http/middleware/tokenInjector';
import { createRefreshOn401 } from '@/lib/http/middleware/refreshOn401';
import { createRequestLogger } from '@/lib/http/middleware/requestLogger';
import { createErrorMapper } from '@/lib/http/middleware/errorMapper';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api = createClient<paths>({
  baseUrl,
});

api.use(createTokenInjector(tokenStorage));
api.use(createRequestLogger());
api.use(createErrorMapper());
api.use(createRefreshOn401(baseUrl));
