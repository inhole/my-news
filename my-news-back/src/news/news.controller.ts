import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetNewsDto } from './dto/get-news.dto';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

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
