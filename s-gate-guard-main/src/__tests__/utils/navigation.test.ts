import { backOrHome } from '@/utils/navigation';

const makeRouter = (canGoBack?: boolean) => ({
  back: jest.fn(),
  replace: jest.fn(),
  ...(canGoBack === undefined ? {} : { canGoBack: () => canGoBack }),
}) as any;

describe('backOrHome', () => {
  it('goes one screen back when there is a screen behind', () => {
    const router = makeRouter(true);
    backOrHome(router);
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('goes Home when the screen was opened with nothing behind it', () => {
    const router = makeRouter(false);
    backOrHome(router);
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });
});
