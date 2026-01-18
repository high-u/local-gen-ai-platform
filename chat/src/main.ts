import './style.css';
import { mount, tags } from '@twiqjs/twiq';
import { hc } from 'hono/client';
import type { AppType } from 'llm-proxy/src/index';

const client = hc<AppType>('http://localhost:3000');

const { div, textarea, button } = tags;

const llm =
  (input: HTMLTextAreaElement, output: HTMLTextAreaElement) => async () => {
    const promptText = input.value;
    output.value = '';

    try {
      const response = await client.v1.completions.stream.$post({
        json: {
          prompt: promptText,
        },
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.content) {
                output.value += json.content;
              }
            } catch (e) {
              console.error('Error parsing JSON', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      output.value = 'Error generating response.';
    }
  };

const App = () => {
  const inputPrompt = textarea({}, '');
  const prompt = textarea({ readonly: true }, '');
  const generated = textarea({ readonly: true }, '');
  const completion = textarea({ readonly: true }, '');
  return div(
    {},
    div({}, inputPrompt),
    div({}, button({ onclick: llm(inputPrompt, generated) }, 'send')),
    div({}, prompt, generated),
    div({}, completion),
  );
};

mount('app', App());
