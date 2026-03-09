import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetNewsDto } from './dto/get-news.dto';
import { NewsBatchService } from './news-batch.service';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(
    private newsService: NewsService,
    private newsBatchService: NewsBatchService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '뉴스 목록 조회',
    description:
      '뉴스 목록을 페이지네이션, 카테고리, 검색어 조건으로 조회합니다.',
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

  @Post('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '네이버 뉴스 수집 실행',
    description:
      '네이버 뉴스 API에서 뉴스를 수집해 저장합니다. 카테고리를 지정하지 않으면 전체 카테고리를 순차 실행합니다.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: '수집할 카테고리 slug',
    example: 'technology',
  })
  @ApiResponse({ status: 200, description: '뉴스 수집 요청 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async fetchNews(@Query('category') category?: string) {
    if (category) {
      const count = await this.newsService.fetchAndCacheNews(category);
      return {
        message: `Fetched and cached ${count} articles for category: ${category}`,
        count,
        category,
      };
    }

    await this.newsBatchService.manualFetchNews();
    return {
      message: 'Batch job triggered for all categories',
      note: 'This process runs in the background. Check logs for progress.',
    };
  }
}
