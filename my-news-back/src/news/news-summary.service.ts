import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NewsSourceType } from '@prisma/client';
import axios from 'axios';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

interface OllamaGenerateResponse {
  response?: string;
}

@Injectable()
export class NewsSummaryService {
  private readonly logger = new Logger(NewsSummaryService.name);
  private readonly enabled: boolean;
  private readonly model: string;
  private readonly ollamaBaseUrl: string;
  private readonly maxInputLength: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.enabled =
      this.configService.get<string>('ENABLE_LOCAL_LLM_SUMMARY') === 'true';
    this.model =
      this.configService.get<string>('LOCAL_LLM_MODEL') || 'qwen3:1.7b';
    this.ollamaBaseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ||
      'http://localhost:11434';
    this.maxInputLength = this.readPositiveInt(
      'LOCAL_LLM_SUMMARY_MAX_INPUT',
      6000,
    );
  }

  async summarizeNews(newsId: string, refresh = false) {
    if (!this.enabled) {
      throw new BadRequestException('Local LLM summary is disabled.');
    }

    // The AI-summary feature only exists on the press news-detail screen;
    // community/blog articles must not be summarized/cached through it.
    const news = await this.prisma.news.findFirst({
      where: { id: newsId, sourceType: NewsSourceType.PRESS },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        llmSummary: true,
      },
    });

    if (!news) {
      throw new NotFoundException('News not found.');
    }

    const sourceText = this.buildSourceText(news);
    if (!sourceText) {
      throw new BadRequestException('News content is empty.');
    }

    const contentHash = this.hashText(sourceText);

    if (
      !refresh &&
      news.llmSummary &&
      news.llmSummary.contentHash === contentHash &&
      news.llmSummary.model === this.model
    ) {
      return {
        id: news.id,
        summary: news.llmSummary.summary,
        summaryLines: news.llmSummary.summaryLines,
        model: news.llmSummary.model,
        cached: true,
      };
    }

    const summaryLines = await this.generateSummaryLines(
      news.title,
      sourceText.slice(0, this.maxInputLength),
    );
    const summary = summaryLines.join(' ');

    await this.prisma.newsLlmSummary.upsert({
      where: { newsId: news.id },
      update: {
        summary,
        summaryLines,
        model: this.model,
        contentHash,
      },
      create: {
        newsId: news.id,
        summary,
        summaryLines,
        model: this.model,
        contentHash,
      },
    });

    return {
      id: news.id,
      summary,
      summaryLines,
      model: this.model,
      cached: false,
    };
  }

  private async generateSummaryLines(
    title: string,
    sourceText: string,
  ): Promise<string[]> {
    try {
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: this.model,
          stream: false,
          prompt: [
            'Summarize the following Korean news article in Korean.',
            'Return exactly 3 concise lines.',
            'Include only core facts from the article.',
            'Do not include speculation, commentary, or reasoning steps.',
            'Do not number the lines.',
            '',
            `Title: ${title}`,
            '',
            sourceText,
          ].join('\n'),
        },
        { timeout: 60000 },
      );

      const raw = this.stripThinking(response.data.response?.trim() || '');
      if (!raw) {
        throw new Error('Ollama response was empty.');
      }

      const lines = raw
        .split(/\n+/)
        .map((line) =>
          line
            .replace(/^\s*[-*]\s*/, '')
            .replace(/^\s*\d+[.)]\s*/, '')
            .trim(),
        )
        .filter(Boolean)
        .slice(0, 3);

      if (lines.length === 0) {
        throw new Error('Ollama response did not include summary lines.');
      }

      return lines;
    } catch (error) {
      this.logger.error('Failed to summarize news with local LLM', error);
      throw new BadRequestException('Failed to summarize news.');
    }
  }

  private buildSourceText(news: {
    title: string;
    description: string | null;
    content: string | null;
  }): string {
    return [news.title, news.description, news.content]
      .filter(Boolean)
      .join('\n\n')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private stripThinking(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  private readPositiveInt(key: string, fallback: number): number {
    const value = Number.parseInt(
      this.configService.get<string>(key) || '',
      10,
    );

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
