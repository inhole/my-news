import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class BookmarkController {
  constructor(private bookmarkService: BookmarkService) {}

  @Post()
  @ApiOperation({
    summary: '북마크 추가',
    description: '뉴스를 북마크에 추가합니다.',
  })
  @ApiResponse({ status: 201, description: '북마크 추가 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 409, description: '이미 북마크된 뉴스' })
  async create(
    @CurrentUser() user: any,
    @Body() createBookmarkDto: CreateBookmarkDto,
  ) {
    return this.bookmarkService.create(user.id, createBookmarkDto);
  }

  @Get()
  @ApiOperation({
    summary: '북마크 목록 조회',
    description: '사용자의 북마크 목록을 조회합니다.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '페이지네이션 커서',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지당 항목 수',
    example: 20,
  })
  @ApiResponse({ status: 200, description: '북마크 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async findAll(
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.bookmarkService.findAll(user.id, cursor, limit);
  }

  @Delete(':id')
  @ApiOperation({ summary: '북마크 삭제', description: '북마크를 삭제합니다.' })
  @ApiParam({
    name: 'id',
    description: '북마크 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: '북마크 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @ApiResponse({ status: 404, description: '북마크를 찾을 수 없음' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookmarkService.remove(user.id, id);
  }
}
