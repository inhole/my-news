import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { NewsBatchService } from './news-batch.service';
import { GetNewsDto } from './dto/get-news.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(
    private newsService: NewsService,
    private newsBatchService: NewsBatchService,
  ) {}

  @Get()
  @ApiOperation({ summary: '뉴스 목록 조회', description: '뉴스 목록을 페이지네이션과 함께 조회합니다.' })
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
  @ApiOperation({ summary: '카테고리 목록 조회', description: '사용 가능한 모든 뉴스 카테고리 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '카테고리 목록 조회 성공' })
  async getCategories() {
    return this.newsService.getCategories();
  }

  @Get('search')
  @ApiOperation({ summary: '뉴스 검색', description: '키워드로 뉴스를 검색합니다.' })
  @ApiResponse({ status: 200, description: '검색 결과 조회 성공' })
  async searchNews(@Query() query: GetNewsDto) {
    return this.newsService.searchNews(
      query.search || '',
      query.cursor,
      query.limit,
    );
  }

  @Get('category/:category')
  @ApiOperation({ summary: '카테고리별 뉴스 조회', description: '특정 카테고리의 뉴스 목록을 조회합니다.' })
  @ApiParam({ name: 'category', description: '카테고리 slug', example: 'technology' })
  @ApiResponse({ status: 200, description: '카테고리별 뉴스 조회 성공' })
  async getNewsByCategory(
    @Param('category') category: string,
    @Query() query: GetNewsDto,
  ) {
    return this.newsService.getNewsByCategory(
      category,
      query.cursor,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '뉴스 상세 조회', description: 'ID로 특정 뉴스의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'id', description: '뉴스 ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: '뉴스 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '뉴스를 찾을 수 없음' })
  async getNewsById(@Param('id') id: string) {
    return this.newsService.getNewsById(id);
  }

  @Post('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '외부 API에서 뉴스 가져오기 (수동 트리거)',
    description: '외부 뉴스 API에서 뉴스를 수동으로 가져와 캐시합니다. 카테고리를 지정하지 않으면 모든 카테고리를 가져옵니다. (인증 필요)'
  })
  @ApiQuery({ name: 'category', required: false, description: '가져올 뉴스의 카테고리 (선택사항)', example: 'technology' })
  @ApiResponse({ status: 200, description: '뉴스 가져오기 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async fetchNews(@Query('category') category?: string) {
    if (category) {
      const count = await this.newsService.fetchAndCacheNews(category);
      return {
        message: `Fetched and cached ${count} articles for category: ${category}`,
        count,
        category
      };
    } else {
      await this.newsBatchService.manualFetchNews();
      return {
        message: 'Batch job triggered for all categories',
        note: 'This process runs in the background. Check logs for progress.'
      };
    }
  }
}
