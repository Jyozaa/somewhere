import { SomewhereApp } from './app/SomewhereApp';

const app = new SomewhereApp();
app.init().catch((error: unknown) => {
  console.error(error);
  const ui = document.getElementById('ui');
  if (ui) {
    ui.innerHTML = `
      <div class="loading" style="display:grid">
        <div class="loading__inner">
          <h1>somewhere<span>.</span></h1>
          <p class="loading__line">The island could not be reached just now.</p>
          <p class="loading__hint">Please refresh. If the problem continues, your browser may not support WebGL 2.</p>
        </div>
      </div>`;
  }
});
