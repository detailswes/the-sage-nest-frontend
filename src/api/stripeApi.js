import { api } from './authApi';

export const createConnectLink = () =>
  api.post('/stripe/connect').then((r) => r.data);

export const verifyStripeReturn = () =>
  api.get('/stripe/return').then((r) => r.data);
