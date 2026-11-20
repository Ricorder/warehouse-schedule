'use client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from './@generated/server';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();