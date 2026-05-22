import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetNewsDto } from './dto/get-news.dto';
import { ReindexNewsEmbeddingsDto } from './dto/reindex-news-embeddings.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { NewsRagService } from './news-rag.service';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly newsRagService: NewsRagService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '뉴스 목록 조회',
    description: '카테고리와 검색어 조건으로 뉴스 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '뉴스 목록 조회 성공' })
  async getNews(@Query() query: GetNewsDto) {
    return this.newsService.getNews(
      query.cursor,
      query.limit,
      query.category,
      query.search,
    );
  }

  @Get('categories')
  @ApiOperation({
    summary: '카테고리 목록 조회',
    description: '사용 가능한 뉴스 카테고리 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '카테고리 목록 조회 성공' })
  async getCategories() {
    return this.newsService.getCategories();
  }

  @Get('search')
  @ApiOperation({
    summary: '뉴스 검색',
    description: '검색어로 뉴스 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '뉴스 검색 성공' })
  async searchNews(@Query() query: GetNewsDto) {
    return this.newsService.searchNews(
      query.search || '',
      query.cursor,
      query.limit,
    );
  }

  @Get('semantic-search')
  @ApiOperation({
    summary: '뉴스 의미 검색',
    description: 'RAG 임베딩을 사용해 의미적으로 가까운 뉴스를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '뉴스 의미 검색 성공' })
  async semanticSearch(@Query() query: SemanticSearchDto) {
    return this.newsRagService.semanticSearch(query.q, query.limit);
  }

  @Post('embeddings/reindex')
  @ApiOperation({
    summary: '뉴스 임베딩 재색인',
    description: '최근 뉴스 본문을 chunk로 나누고 RAG 임베딩을 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '뉴스 임베딩 재색인 성공' })
  async reindexNewsEmbeddings(@Body() body: ReindexNewsEmbeddingsDto) {
    return this.newsRagService.indexRecentNews(body.limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: '뉴스 상세 조회',
    description: '뉴스 ID로 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '뉴스 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: '뉴스 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '뉴스를 찾을 수 없음' })
  async getNewsById(@Param('id') id: string) {
    return this.newsService.getNewsById(id);
  }
}
