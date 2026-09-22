import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = { method: 'GET', url: '/news/1' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  it('hides the internal error message for an unexpected Error', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHost();

    filter.catch(new Error('database password is 12345'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
    const [payload] = json.mock.calls[0] as [Record<string, unknown>];
    expect(JSON.stringify(payload)).not.toContain('database password');
  });

  it('preserves the message for an intentional HttpException', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHost();

    filter.catch(new BadRequestException('Invalid category'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid category' }),
    );
  });
});
