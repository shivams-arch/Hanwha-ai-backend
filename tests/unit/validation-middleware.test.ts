import Joi from 'joi';
import { validate } from '../../src/middleware/validation.middleware';
import { ValidationError } from '../../src/middleware/error.middleware';

const buildReq = () => ({ body: { name: 'Finny', age: 21 } } as any);

describe('validation middleware', () => {
  const schema = Joi.object({
    name: Joi.string().required(),
    age: Joi.number().min(13).required(),
  });

  it('passes sanitized payload to next middleware', () => {
    const req = buildReq();
    const next = jest.fn();

    validate(schema, 'body')(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Finny', age: 21 });
  });

  it('raises ValidationError for invalid payload', () => {
    const req = buildReq();
    req.body.age = 5;
    const next = jest.fn();

    validate(schema, 'body')(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toMatch(/greater than or equal to 13/);
  });
});
