import CDP from 'chrome-remote-interface';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const client = await CDP({ port: 9222 });
  const { Page, Runtime, Input } = client;

  await Promise.all([Page.enable(), Runtime.enable()]);
  console.log('CDP connected!');

  // Find the model name/selector - it shows "Gemini 3 Flash Preview" which should be clickable
  const modelName = await Runtime.evaluate({
    expression: `
      (function() {
        // Look for the model name text that's clickable
        const allElements = Array.from(document.querySelectorAll('*'));
        const modelEl = allElements.find(e => {
          const text = e.innerText || '';
          return text.includes('Gemini 3 Flash') && e.tagName !== 'BODY' && e.offsetWidth > 0;
        });
        if (modelEl) {
          // Find the closest clickable parent
          let el = modelEl;
          while (el && !el.onclick && el.tagName !== 'BUTTON' && el.getAttribute('role') !== 'button') {
            el = el.parentElement;
          }
          if (!el) el = modelEl;
          const rect = el.getBoundingClientRect();
          return { found: true, x: rect.x + rect.width/2, y: rect.y + rect.height/2, tag: el.tagName, text: el.innerText.slice(0,50) };
        }
        return { found: false };
      })()
    `,
    returnByValue: true
  });

  console.log('Model name element:', modelName.result.value);

  if (modelName.result.value.found) {
    const { x, y } = modelName.result.value;
    await Input.dispatchMouseEvent({ type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await Input.dispatchMouseEvent({ type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    console.log('Clicked on model name');

    await sleep(1500);

    // Now look for model options in any dropdown/dialog that appeared
    const models = await Runtime.evaluate({
      expression: `
        (function() {
          // Look for any new dialog/overlay/dropdown with model options
          const allText = document.body.innerText;
          // Find all clickable elements with model names
          const elements = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], [role="listitem"], li, .mat-option, button'));
          const modelOptions = elements.filter(e => {
            const text = (e.innerText || '').toLowerCase();
            return (text.includes('gemini 3 pro') || text.includes('gemini-3-pro') || text.includes('flash') && text.includes('think')) && e.offsetWidth > 0;
          }).map(e => {
            const rect = e.getBoundingClientRect();
            return { text: e.innerText.slice(0, 60), x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
          });
          return modelOptions.slice(0, 5);
        })()
      `,
      returnByValue: true
    });

    console.log('Model options found:', models.result.value);

    if (models.result.value.length > 0) {
      // Click on a different model (preferably Gemini 3 Pro)
      const targetModel = models.result.value.find(m => m.text.toLowerCase().includes('pro')) || models.result.value[0];
      await Input.dispatchMouseEvent({ type: 'mousePressed', x: targetModel.x, y: targetModel.y, button: 'left', clickCount: 1 });
      await Input.dispatchMouseEvent({ type: 'mouseReleased', x: targetModel.x, y: targetModel.y, button: 'left', clickCount: 1 });
      console.log('Selected model:', targetModel.text);

      await sleep(1000);

      // Verify the change
      const newModel = await Runtime.evaluate({ expression: 'document.body.innerText' });
      console.log('Page after model change (snippet):', newModel.result.value.slice(0, 1000));
    }
  }

  await client.close();
}

main().catch(console.error);
