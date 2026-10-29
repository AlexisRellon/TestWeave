import type { CliContext } from './context.js';
import { startUi } from '../ui/server.js';

export interface RunUiOptions { port?: number | string }

export async function runUi(context: CliContext, options: RunUiOptions = {}): Promise<void> {
  if (typeof options.port === 'string' && !/^\d+$/.test(options.port)) throw new Error('Port must be an integer from 0 to 65535');
  const viewer = await startUi(context, { port: options.port === undefined ? 0 : Number(options.port) });
  context.output.log(`TestWeave viewer: ${viewer.url}`);
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      viewer.server.off('error', fail);
    };
    const stop = () => { cleanup(); void viewer.close().then(resolve, reject); };
    const fail = (error: Error) => { cleanup(); void viewer.close().then(() => reject(error), reject); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    viewer.server.once('error', fail);
  });
}
