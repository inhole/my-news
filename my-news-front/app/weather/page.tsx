'use client';

import { WeatherWidget } from '@/components/layout/weather-widget';

export default function WeatherPage() {
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <WeatherWidget />
    </div>
  );
}
