import { createStorage as createUnstorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

export const createStorage = (storageName: string) => {
  const storage = createUnstorage({
    driver: fsDriver({ base: `./.cache/${storageName}` }),
  });

  return {
    getItem: async <T>(key: string): Promise<T | null> => {
      return await storage.getItem<T>(key);
    },
    // biome-ignore lint/suspicious/noExplicitAny: Storage value can be any serializable type
    setItem: async (key: string, value: any): Promise<void> => {
      await storage.setItem(key, value);
    },
    getKeys: async (): Promise<
      {
        key: string;
        meta: { createdAt: Date; updatedAt: Date; size: number };
      }[]
    > => {
      const keys = await storage.getKeys();
      const items = await Promise.all(
        keys.map(async (key) => {
          const meta = await storage.getMeta(key);
          return {
            key,
            meta: {
              createdAt: meta.birthtime as Date,
              updatedAt: meta.mtime as Date,
              size: (meta.size as number) || 0,
            },
          };
        }),
      );
      return items;
    },
  };
};
