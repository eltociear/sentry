import {SampledProfile} from 'sentry/utils/profiling/profile/sampledProfile';

import {firstCallee, makeTestingBoilerplate} from './profile.spec';

describe('SampledProfile', () => {
  it('imports the base properties', () => {
    const trace: Profiling.SampledProfile = {
      name: 'profile',
      startValue: 0,
      endValue: 1000,
      unit: 'milliseconds',
      type: 'sampled',
      weights: [],
      samples: [],
      shared: {
        frames: [],
      },
    };

    const profile = SampledProfile.FromProfile(trace);

    expect(profile.duration).toBe(1000);
    expect(profile.name).toBe(trace.name);
    expect(profile.startedAt).toBe(0);
    expect(profile.endedAt).toBe(1000);
  });

  it('rebuilds the stack', () => {
    const trace: Profiling.SampledProfile = {
      name: 'profile',
      startValue: 0,
      endValue: 1000,
      unit: 'milliseconds',
      type: 'sampled',
      weights: [1, 1],
      samples: [
        [0, 1],
        [0, 1],
      ],
      shared: {
        frames: [{name: 'f0'}, {name: 'f1'}],
      },
    };

    const {open, close, openSpy, closeSpy, timings} = makeTestingBoilerplate();

    const profile = SampledProfile.FromProfile(trace);

    profile.forEach(open, close);

    expect(timings).toEqual([
      ['f0', 'open'],
      ['f1', 'open'],
      ['f1', 'close'],
      ['f0', 'close'],
    ]);
    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(closeSpy).toHaveBeenCalledTimes(2);

    const root = firstCallee(profile.appendOrderTree);

    expect(root.totalWeight).toEqual(2);
    expect(firstCallee(root).totalWeight).toEqual(2);

    expect(root.selfWeight).toEqual(0);
    expect(firstCallee(root).selfWeight).toEqual(2);
  });

  it('marks direct recursion', () => {
    const trace: Profiling.SampledProfile = {
      name: 'profile',
      startValue: 0,
      endValue: 1000,
      unit: 'milliseconds',
      type: 'sampled',
      weights: [1],
      samples: [[0, 0]],
      shared: {
        frames: [{name: 'f0'}, {name: 'f1'}],
      },
    };

    const profile = SampledProfile.FromProfile(trace);

    expect(firstCallee(firstCallee(profile.appendOrderTree)).isRecursive()).toBe(true);
  });

  it('marks indirect recursion', () => {
    const trace: Profiling.SampledProfile = {
      name: 'profile',
      startValue: 0,
      endValue: 1000,
      unit: 'milliseconds',
      type: 'sampled',
      weights: [1],
      samples: [[0, 1, 0]],
      shared: {
        frames: [{name: 'f0'}, {name: 'f1'}],
      },
    };

    const profile = SampledProfile.FromProfile(trace);

    expect(
      firstCallee(firstCallee(firstCallee(profile.appendOrderTree))).isRecursive()
    ).toBe(true);
  });

  it('tracks minFrameDuration', () => {
    const trace: Profiling.SampledProfile = {
      name: 'profile',
      startValue: 0,
      endValue: 1000,
      unit: 'milliseconds',
      type: 'sampled',
      weights: [0.5, 2],
      samples: [
        [0, 1],
        [0, 2],
      ],
      shared: {
        frames: [{name: 'f0'}, {name: 'f1'}, {name: 'f2'}],
      },
    };

    const profile = SampledProfile.FromProfile(trace);

    expect(profile.minFrameDuration).toBe(0.5);
  });
});
