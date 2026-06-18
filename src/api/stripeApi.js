import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from '../store/baseQuery';

export const stripeApi = createApi({
  reducerPath: 'stripeApi',
  baseQuery: axiosBaseQuery,
  endpoints: (builder) => ({
    createConnectLink: builder.mutation({
      query: () => ({ url: '/stripe/connect', method: 'POST' }),
    }),
    verifyStripeReturn: builder.query({
      query: () => ({ url: '/stripe/return' }),
    }),
  }),
});

export const {
  useCreateConnectLinkMutation,
  useVerifyStripeReturnQuery,
  useLazyVerifyStripeReturnQuery,
} = stripeApi;
