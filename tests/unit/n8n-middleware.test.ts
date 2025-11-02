import { verifyN8nSignature } from '../../src/middleware/n8n.middleware';
import { envConfig } from '../../src/config/env.config';
import { AuthenticationError } from '../../src/middleware/error.middleware';

const buildRequest = (headers: Record<string, string>) =>
  ({
    headers,
  } as any);

describe('verifyN8nSignature middleware', () => {
  const originalKey = envConfig.N8N_API_KEY;

  beforeEach(() => {
    envConfig.N8N_API_KEY = 'super-secret';
  });

  afterEach(() => {
    envConfig.N8N_API_KEY = originalKey;
  });

  it('allows requests with valid x-api-key header', () => {
    const req = buildRequest({ 'x-api-key': 'super-secret' });
    const next = jest.fn();

    verifyN8nSignature(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects requests with missing or invalid key', () => {
    const req = buildRequest({});
    const next = jest.fn();

    verifyN8nSignature(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toMatch(/Invalid n8n webhook signature/);
  });
});
