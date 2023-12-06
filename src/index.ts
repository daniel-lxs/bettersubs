import { Elysia } from 'elysia';
import cors from '@elysiajs/cors';
import createLogger from 'logging';

import getEnvOrThrow from './helpers/getOrThrow';
import { subtitlesController } from './controllers/subtitlesController';

const logger = createLogger('Main');

const port = parseInt(getEnvOrThrow('PORT'));
let app = new Elysia()
  .use(cors())
  /*.use(
    rateLimit({
      duration: 2000,
      max: 5,
    })
  )*/
  .onError(({ code, error, set }) => {
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

//Use controller
app = subtitlesController(app);

app.listen(port);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
