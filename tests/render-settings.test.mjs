import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSceneSamples, sceneSamplesForRenderer } from '../src/prototypes/dogfight/assets/render-settings.js';

test('HDR MSAA uses supported counts within the measured budget without silent cost escalation', () => {
  assert.equal(chooseSceneSamples(new Int32Array([8, 4, 2, 1]), 2, 8), 2);
  assert.equal(chooseSceneSamples([4, 1], 2, 4), 0);
  assert.equal(chooseSceneSamples([2, 1], 2, 1), 0);
  assert.equal(chooseSceneSamples([], 2, 0), 0);
  assert.equal(chooseSceneSamples([4, 2], 0, 4), 0);
  assert.equal(sceneSamplesForRenderer({ capabilities: { maxSamples: 4 }, getContext: () => ({ getInternalformatParameter() { throw new Error('unavailable'); } }) }, 2), 0);
});
