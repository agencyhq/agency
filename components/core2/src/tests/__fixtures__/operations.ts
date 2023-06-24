import { Operation } from '../../models/operation';

export default [
  {
    id: '1',
    action: 'create',
    params: { name: 'John Doe' },
    status: 'completed',
    result: { id: '1', name: 'John Doe' },
    createdAt: new Date('2021-01-01'),
    updatedAt: new Date('2021-01-01'),
  },
  {
    id: '2',
    action: 'update',
    params: { id: '1', name: 'Jane Doe' },
    status: 'claimed',
    result: {},
    createdAt: new Date('2021-01-01'),
    updatedAt: new Date('2021-01-01'),
  },
  {
    id: '3',
    action: 'delete',
    params: { id: '1' },
    status: 'requested',
    result: { id: '1' },
    createdAt: new Date('2021-01-01'),
    updatedAt: new Date('2021-01-01'),
  },
] as Operation[];
