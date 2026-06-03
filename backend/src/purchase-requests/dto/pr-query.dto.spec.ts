import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrQueryDto } from './pr-query.dto';

describe('PrQueryDto.eligibleForPo', () => {
  it("transforms the query string 'true' into boolean true", async () => {
    const dto = plainToInstance(PrQueryDto, { eligibleForPo: 'true' });
    expect(dto.eligibleForPo).toBe(true);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("transforms the query string 'false' into boolean false", async () => {
    const dto = plainToInstance(PrQueryDto, { eligibleForPo: 'false' });
    expect(dto.eligibleForPo).toBe(false);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes through real boolean true (programmatic call)', async () => {
    const dto = plainToInstance(PrQueryDto, { eligibleForPo: true });
    expect(dto.eligibleForPo).toBe(true);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('leaves eligibleForPo undefined when the param is absent', async () => {
    const dto = plainToInstance(PrQueryDto, {});
    expect(dto.eligibleForPo).toBeUndefined();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
