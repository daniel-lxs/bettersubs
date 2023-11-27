import { Elysia } from 'elysia';
import createLogger from 'logging';
import getEnvOrThrow from './helpers/getOrThrow';
import { subtitlesController } from './controllers/subtitlesController';

const port = parseInt(getEnvOrThrow('PORT'));
const app = new Elysia().onError(({ code, error, set }) => {
  logger.error(`${error.message} ${error.cause} ${error.stack}`);
  switch (code) {
    case 'NOT_FOUND':
      set.status = 404;
      return 'Not Found :(';

    case 'INTERNAL_SERVER_ERROR':
      set.status = 500;
      return 'Internal Server Error';

    case 'PARSE':
      set.status = 400;
      return 'Parse Error';
  }
});
const logger = createLogger('App');

//Use controller
subtitlesController(app, logger);

app.listen(port);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
