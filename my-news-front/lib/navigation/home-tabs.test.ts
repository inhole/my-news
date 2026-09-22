import assert from 'node:assert/strict';
import { DEFAULT_HOME_TAB, HOME_TABS, isHomeTab, resolveHomeTab } from './home-tabs';

// 허용 목록에 있는 값은 그대로 HomeTab으로 인정한다.
for (const tab of HOME_TABS) {
  assert.equal(isHomeTab(tab.id), true);
  assert.equal(resolveHomeTab(tab.id), tab.id);
}

// 허용되지 않은 값은 거부하고 기본 탭으로 대체한다.
assert.equal(isHomeTab('abc'), false);
assert.equal(resolveHomeTab('abc'), DEFAULT_HOME_TAB);

// 값이 없을 때도 기본 탭으로 대체한다.
assert.equal(isHomeTab(null), false);
assert.equal(isHomeTab(undefined), false);
assert.equal(resolveHomeTab(null), DEFAULT_HOME_TAB);
assert.equal(resolveHomeTab(undefined), DEFAULT_HOME_TAB);

console.log('home-tabs.test.ts: all assertions passed');
