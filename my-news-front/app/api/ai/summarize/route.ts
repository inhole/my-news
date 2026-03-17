import { NextResponse } from 'next/server';

interface SummarizeRequestItem {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  categoryName?: string;
}

interface OpenAIChoice {
  message?: {
    content?: string;
  };
}

function cleanText(value?: string | null) {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim();
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?。！？])\s+|(?<=다\.)\s+|(?<=요\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function buildFallbackSummary(article: SummarizeRequestItem) {
  const baseText = cleanText([article.description, article.content].filter(Boolean).join(' '));
  const sentences = splitSentences(baseText);
  const lines = [
    `${article.categoryName ?? '맞춤 뉴스'} 이슈: ${cleanText(article.title)}`,
    sentences[0] ?? cleanText(article.description) ?? '핵심 내용을 불러오는 중입니다.',
    sentences[1] ?? '본문이 짧아 추가 요약은 생략했습니다.',
  ];

  return lines.map((line) => line.slice(0, 120));
}

async function summarizeWithOpenAI(article: SummarizeRequestItem) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const prompt = [
    '다음 뉴스 문서를 한국어 3줄로 요약해 주세요.',
    '각 줄은 45자 이내로 짧고 정보 밀도 높게 작성합니다.',
    '번호, 불릿, 제목 없이 줄바꿈 3개만 반환합니다.',
    '',
    `제목: ${cleanText(article.title)}`,
    `카테고리: ${cleanText(article.categoryName)}`,
    `설명: ${cleanText(article.description)}`,
    `본문: ${cleanText(article.content)}`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { choices?: OpenAIChoice[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const lines = content
    .split('\n')
    .map((line) => line.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  return lines.length === 3 ? lines : null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { articles?: SummarizeRequestItem[] };
  const articles = Array.isArray(body.articles) ? body.articles.slice(0, 6) : [];

  const summaries = await Promise.all(
    articles.map(async (article) => {
      const aiSummary = await summarizeWithOpenAI(article).catch(() => null);
      return {
        id: article.id,
        lines: aiSummary ?? buildFallbackSummary(article),
      };
    }),
  );

  return NextResponse.json({ summaries });
}
