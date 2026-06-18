import { configureStore } from '@reduxjs/toolkit';
import { adminApi } from '../api/adminApi';
import { expertApi } from '../api/expertApi';
import { bookingApi } from '../api/bookingApi';
import { blockoutApi } from '../api/blockoutApi';
import { stripeApi } from '../api/stripeApi';
import { userApi } from '../api/userApi';

export const store = configureStore({
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
    [expertApi.reducerPath]: expertApi.reducer,
    [bookingApi.reducerPath]: bookingApi.reducer,
    [blockoutApi.reducerPath]: blockoutApi.reducer,
    [stripeApi.reducerPath]: stripeApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      adminApi.middleware,
      expertApi.middleware,
      bookingApi.middleware,
      blockoutApi.middleware,
      stripeApi.middleware,
      userApi.middleware,
    ),
});
