import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { doc } from './test-utils.js';
import { setup, setupBuild } from './helpers.js';

const Components = suite('Components tests');

setup(Components, './fixtures/astro-bare-component-imports');
setupBuild(Components, './fixtures/astro-bare-component-imports');

Components('Disallows bare relative component imports', async ({ build }) => {
  try {
    await build();
    assert.unreachable('Build should have thrown an error');
  } catch (e) {
    assert.is(e.message, 'Try `import BareRelativeComponent from "BareRelativeComponent.{js|ts|jsx|tsx}";`');
  }
});

Components.run();
