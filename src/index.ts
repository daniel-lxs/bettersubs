import { Elysia } from 'elysia';
import cors from '@elysiajs/cors';
import createLogger from 'logging';

import getEnvOrThrow from './helpers/getOrThrow';
import { subtitlesController } from './controllers/subtitlesController';
import { usersController } from './controllers/usersController';

const logger = createLogger('Main');

const port = parseInt(getEnvOrThrow('PORT'));
let app = new Elysia().use(cors());
/*.use(
    rateLimit({
      duration: 2000,
      max: 5,
    })
  )*/

//Use controller
app = subtitlesController(app);
app = usersController(app);

app.listen(port);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
