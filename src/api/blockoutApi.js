import { createApi } from '@reduxjs/toolkit/query/react';
import axiosBaseQuery from '../store/baseQuery';

export const blockoutApi = createApi({
  reducerPath: 'blockoutApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Blockout'],
  endpoints: (builder) => ({
    // arg: { from, to }
    listBlockouts: builder.query({
      query: ({ from, to }) => ({ url: '/blockouts', params: { from, to } }),
      providesTags: ['Blockout'],
    }),
    createBlockout: builder.mutation({
      query: (data) => ({ url: '/blockouts', method: 'POST', data }),
      invalidatesTags: ['Blockout'],
    }),
    deleteBlockout: builder.mutation({
      query: (id) => ({ url: `/blockouts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Blockout'],
    }),
  }),
});

export const {
  useListBlockoutsQuery,
  useCreateBlockoutMutation,
  useDeleteBlockoutMutation,
} = blockoutApi;
