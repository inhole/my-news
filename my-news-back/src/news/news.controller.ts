import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireNewsAdminKey } from './decorators/require-news-admin-key.decorator';
import { FetchCommunityNewsDto } from './dto/fetch-community-news.dto';
import { GetCommunityNewsDto } from './dto/get-community-news.dto';
import { GetNewsDto } from './dto/get-news.dto';
import { ReindexNewsEmbeddingsDto } from './dto/reindex-news-embeddings.dto';
import { SemanticSearchDto } from './dto/semantic-search.dto';
import { SummarizeNewsDto } from './dto/summarize-news.dto';
import {
  NEWS_ADMIN_KEY_HEADER,
  NewsAdminGuard,
} from './guards/news-admin.guard';
import { NewsBatchService } from './news-batch.service';
import { NewsRagService } from './news-rag.service';
import { NewsService } from './news.service';
import { NewsSummaryService } from './news-summary.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly newsRagService: NewsRagService,
    private readonly newsSummaryService: NewsSummaryService,
    private readonly newsBatchService: NewsBatchService,
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

  @Get('community')
  @ApiOperation({
    summary: '커뮤니티/개발자 뉴스 목록 조회',
    description:
      'GeekNews, Hacker News 등 커뮤니티 소스의 최신 글 목록을 조회합니다. ' +
      '일반 뉴스 목록(/news)과는 분리된 목록이며, 언론사 기사는 포함되지 않습니다.',
  })
  @ApiResponse({ status: 200, description: '커뮤니티 뉴스 목록 조회 성공' })
  async getCommunityNews(@Query() query: GetCommunityNewsDto) {
    return this.newsService.getCommunityNews(query.cursor, query.limit);
  }

  @Post('community/fetch')
  @UseGuards(NewsAdminGuard)
  @RequireNewsAdminKey()
  @ApiOperation({
    summary: '커뮤니티 뉴스 수동 수집',
    description:
      'GeekNews 또는 Hacker News에서 즉시 기사를 수집합니다. 외부 호출을 발생시키는 ' +
      `관리자 전용 작업으로 ${NEWS_ADMIN_KEY_HEADER} 헤더에 NEWS_ADMIN_API_KEY 값을 담아 호출해야 합니다.`,
  })
  @ApiHeader({
    name: NEWS_ADMIN_KEY_HEADER,
    description: '관리자 API 키 (NEWS_ADMIN_API_KEY)',
    required: true,
  })
  @ApiResponse({ status: 201, description: '커뮤니티 뉴스 수동 수집 성공' })
  @ApiResponse({ status: 401, description: '관리자 API 키 누락/불일치' })
  @ApiResponse({ status: 403, description: '관리자 API 키 미설정' })
  async fetchCommunityNews(@Body() body: FetchCommunityNewsDto) {
    const savedCount = await this.newsBatchService.manualFetchCommunityNews(
      body.source,
    );
    return { source: body.source, savedCount };
  }

  @Post('embeddings/reindex')
  @UseGuards(NewsAdminGuard)
  @RequireNewsAdminKey()
  @ApiOperation({
    summary: '뉴스 임베딩 재색인',
    description:
      '최근 뉴스 본문을 chunk로 나누고 RAG 임베딩을 생성합니다. 관리자 전용 작업으로 ' +
      `${NEWS_ADMIN_KEY_HEADER} 헤더에 NEWS_ADMIN_API_KEY 값을 담아 호출해야 합니다.`,
  })
  @ApiHeader({
    name: NEWS_ADMIN_KEY_HEADER,
    description: '관리자 API 키 (NEWS_ADMIN_API_KEY)',
    required: true,
  })
  @ApiResponse({ status: 201, description: '뉴스 임베딩 재색인 성공' })
  @ApiResponse({ status: 401, description: '관리자 API 키 누락/불일치' })
  @ApiResponse({ status: 403, description: '관리자 API 키 미설정' })
  async reindexNewsEmbeddings(@Body() body: ReindexNewsEmbeddingsDto) {
    return this.newsRagService.indexRecentNews(body.limit);
  }

  @Post(':id/summary')
  @UseGuards(NewsAdminGuard)
  @ApiOperation({
    summary: '뉴스 로컬 LLM 요약',
    description:
      '로컬 LLM으로 뉴스 본문을 3줄 요약하고 결과를 캐시합니다. 캐시된 요약 조회는 ' +
      `공개이지만, refresh=true로 강제 재생성하려면 ${NEWS_ADMIN_KEY_HEADER} 헤더에 ` +
      'NEWS_ADMIN_API_KEY 값이 필요합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '뉴스 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiHeader({
    name: NEWS_ADMIN_KEY_HEADER,
    description:
      'refresh=true일 때만 필요한 관리자 API 키 (NEWS_ADMIN_API_KEY)',
    required: false,
  })
  @ApiResponse({ status: 201, description: '뉴스 요약 성공' })
  @ApiResponse({
    status: 401,
    description: 'refresh=true 요청에서 관리자 API 키 누락/불일치',
  })
  @ApiResponse({
    status: 403,
    description: 'refresh=true 요청인데 관리자 API 키 미설정',
  })
  async summarizeNews(@Param('id') id: string, @Body() body: SummarizeNewsDto) {
    return this.newsSummaryService.summarizeNews(id, body.refresh);
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
