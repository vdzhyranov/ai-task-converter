import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../backend/src/modules/trpc/router';

export const trpc = createTRPCReact<AppRouter>();