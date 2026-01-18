import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { createStorage } from './storage';

const app = new Hono();
const conversationStorage = createStorage('conversations');

app.get('/', serveStatic({ path: './public/index.html' }));
app.use('*', cors({ origin: '*' }));

const routes = app
  .get('/v1/completions', async (c) => {
    const items = await conversationStorage.getKeys();
    const response = items.map((item) => ({
      key: item.key,
      meta: {
        ...item.meta,
        createdAt: item.meta.createdAt.toISOString(),
        updatedAt: item.meta.updatedAt.toISOString(),
      },
    }));
    return c.json(response);
  })
  .post(
    '/v1/completions/stream',
    zValidator(
      'json',
      z.object({
        completionId: z.string().optional(),
        prompt: z.string(),
        system: z.string().optional(),
      }),
    ),
    async (c) => {
      const {
        completionId: reqCompletionId,
        prompt,
        system,
      } = c.req.valid('json');

      let messages: { role: string; content: string }[] = [];

      if (reqCompletionId) {
        const stored =
          await conversationStorage.getItem<
            { role: string; content: string }[]
          >(reqCompletionId);
        if (!stored) {
          return c.json({ error: 'Invalid completionId' }, 400);
        }
        messages = stored;
      }

      const completionId = reqCompletionId ?? nanoid();

      if (system) {
        const systemMessageIndex = messages.findIndex(
          (m) => m.role === 'system',
        );
        if (systemMessageIndex !== -1) {
          messages[systemMessageIndex].content = system;
        } else {
          messages.unshift({ role: 'system', content: system });
        }
      }

      messages.push({ role: 'user', content: prompt });

      await conversationStorage.setItem(completionId, messages);

      const response = await fetch(
        'http://127.0.0.1:1234/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'lfm2.5-1.2b-instruct@q4_k_m',
            messages: messages,
            stream: true,
          }),
        },
      );

      if (!response.body) {
        return c.json({ error: 'No response body' }, 500);
      }

      let index = 0;
      let accumulatedContent = '';

      const transformer = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed === 'data: [DONE]') {
              messages.push({ role: 'assistant', content: accumulatedContent });
              await conversationStorage.setItem(completionId, messages);

              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              continue;
            }

            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                const finishReason = json.choices?.[0]?.finish_reason;
                const error = json.error;

                if (error) {
                  const errorChunk = {
                    completionId,
                    error,
                    stop: true,
                  };
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify(errorChunk)}\n\n`,
                    ),
                  );
                }

                if (content) {
                  accumulatedContent += content;
                  const newChunk = {
                    completionId,
                    content,
                    index: index++,
                    stop: false,
                  };
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify(newChunk)}\n\n`,
                    ),
                  );
                }

                if (finishReason === 'stop') {
                  const stopChunk = {
                    completionId,
                    content: '',
                    index: index++,
                    stop: true,
                  };
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify(stopChunk)}\n\n`,
                    ),
                  );
                }
              } catch (e) {
                console.error('Parse error:', e);
                const errorChunk = {
                  completionId,
                  error: {
                    code: 'INTERNAL_ERROR',
                    message:
                      e instanceof Error ? e.message : 'Internal Server Error',
                  },
                  stop: true,
                };
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify(errorChunk)}\n\n`,
                  ),
                );
              }
            }
          }
        },
      });

      const stream = response.body.pipeThrough(transformer);
      return new Response(stream, response);
    },
  );

export type AppType = typeof routes;
export default app;
