import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FetchCommunityNewsDto } from './fetch-community-news.dto';
import { GetCommunityNewsDto } from './get-community-news.dto';
import { GetNewsDto } from './get-news.dto';
import { ReindexNewsEmbeddingsDto } from './reindex-news-embeddings.dto';
import { SemanticSearchDto } from './semantic-search.dto';

describe('News DTO limit bounds', () => {
  it('rejects GetNewsDto.limit above 100', async () => {
    const dto = plainToInstance(GetNewsDto, { limit: '101' });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('accepts GetNewsDto.limit at the 100 boundary', async () => {
    const dto = plainToInstance(GetNewsDto, { limit: '100' });
    const errors = await validate(dto);

    expect(errors.filter((error) => error.property === 'limit')).toHaveLength(
      0,
    );
  });

  it('rejects ReindexNewsEmbeddingsDto.limit above 100', async () => {
    const dto = plainToInstance(ReindexNewsEmbeddingsDto, { limit: '500' });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('accepts ReindexNewsEmbeddingsDto.limit at the 100 boundary', async () => {
    const dto = plainToInstance(ReindexNewsEmbeddingsDto, { limit: '100' });
    const errors = await validate(dto);

    expect(errors.filter((error) => error.property === 'limit')).toHaveLength(
      0,
    );
  });

  it('rejects SemanticSearchDto.limit above 50', async () => {
    const dto = plainToInstance(SemanticSearchDto, {
      q: 'test',
      limit: '51',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('accepts SemanticSearchDto.limit at the 50 boundary', async () => {
    const dto = plainToInstance(SemanticSearchDto, {
      q: 'test',
      limit: '50',
    });
    const errors = await validate(dto);

    expect(errors.filter((error) => error.property === 'limit')).toHaveLength(
      0,
    );
  });

  it('rejects GetCommunityNewsDto.limit above 50', async () => {
    const dto = plainToInstance(GetCommunityNewsDto, { limit: '51' });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('accepts GetCommunityNewsDto.limit at the 50 boundary', async () => {
    const dto = plainToInstance(GetCommunityNewsDto, { limit: '50' });
    const errors = await validate(dto);

    expect(errors.filter((error) => error.property === 'limit')).toHaveLength(
      0,
    );
  });

  it('rejects FetchCommunityNewsDto.source outside the known source ids', async () => {
    const dto = plainToInstance(FetchCommunityNewsDto, { source: 'naver' });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'source')).toBe(true);
  });

  it('accepts FetchCommunityNewsDto.source for geeknews and hacker-news', async () => {
    for (const source of ['geeknews', 'hacker-news']) {
      const dto = plainToInstance(FetchCommunityNewsDto, { source });
      const errors = await validate(dto);

      expect(
        errors.filter((error) => error.property === 'source'),
      ).toHaveLength(0);
    }
  });
});
