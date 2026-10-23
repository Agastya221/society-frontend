import api from '@/services/api';
import { handoffAdminRole } from '@/services/settings.service';

jest.mock('@/services/api', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn(), patch: jest.fn() } }));

describe('handoffAdminRole', () => {
  it('posts the new admin to the handoff route and returns what the server says', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { data: { newAdmin: { id: 'u1', name: 'Raj', phone: '9000000001' }, oldAdminStaysAsResident: true } },
    });
    const result = await handoffAdminRole('9000000001', 'Raj');
    expect(api.post).toHaveBeenCalledWith('/admin/handoff', { phone: '9000000001', name: 'Raj' });
    expect(result.oldAdminStaysAsResident).toBe(true);
    expect(result.newAdmin.name).toBe('Raj');
  });

  it('lets the server refusal reach the screen', async () => {
    (api.post as jest.Mock).mockRejectedValue({ response: { data: { message: 'This number already belongs to another society' } } });
    await expect(handoffAdminRole('9000000002', 'Sam')).rejects.toMatchObject({
      response: { data: { message: 'This number already belongs to another society' } },
    });
  });
});
