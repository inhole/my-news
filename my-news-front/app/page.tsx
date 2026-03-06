'use client';

import { WeatherWidget } from '@/components/layout/weather-widget';

export default function Home() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6">
      <WeatherWidget />
        {/*TODO 주간 날씨 추가 예정*/}
    </div>
  );
}
