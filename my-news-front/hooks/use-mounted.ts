'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  // 외부에서 값이 바뀌지 않으므로 구독할 것이 없다.
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * 마운트 이전(서버 렌더 및 클라이언트 최초 렌더)에는 false, 마운트 이후에는 true를 반환한다.
 * 서버와 클라이언트가 서로 다른 값을 렌더링해야 하는 경우(현재 시각 기반 값 등)
 * 첫 렌더는 항상 서버와 동일하게 유지하고, 마운트 이후에만 실제 값으로 갱신하기 위해 사용한다.
 * setState를 이펙트 안에서 직접 호출하지 않도록 useSyncExternalStore로 구현했다.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
