import { api } from './authApi';

export const listBlockouts = (from, to) =>
  api.get('/blockouts', { params: { from, to } }).then((r) => r.data);

export const createBlockout = (data) =>
  api.post('/blockouts', data).then((r) => r.data);

export const deleteBlockout = (id) =>
  api.delete(`/blockouts/${id}`).then((r) => r.data);
