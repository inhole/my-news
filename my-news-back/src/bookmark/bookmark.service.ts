import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Injectable()
export class BookmarkService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createBookmarkDto: CreateBookmarkDto) {
    // Check if news exists
    const news = await this.prisma.news.findUnique({
      where: { id: createBookmarkDto.newsId },
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    // Check if bookmark already exists
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_newsId: {
          userId,
          newsId: createBookmarkDto.newsId,
        },
      },
    });

    if (existingBookmark) {
      throw new ConflictException('Bookmark already exists');
    }

    return this.prisma.bookmark.create({
      data: {
        userId,
        newsId: createBookmarkDto.newsId,
      },
      include: {
        news: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, cursor?: string, limit: number = 20) {
    interface WhereClause {
      userId: string;
      id?: { lt: string };
    }

    const where: WhereClause = { userId };

    if (cursor) {
      where.id = { lt: cursor };
    }

    const bookmarks = await this.prisma.bookmark.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        news: {
          include: {
            category: true,
          },
        },
      },
    });

    const hasMore = bookmarks.length > limit;
    const items = hasMore ? bookmarks.slice(0, -1) : bookmarks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async remove(userId: string, id: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { id },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    if (bookmark.userId !== userId) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.prisma.bookmark.delete({
      where: { id },
    });

    return { message: 'Bookmark removed successfully' };
  }
}
