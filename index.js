import process from 'node:process';
import axios from 'axios';
import asyncfs from 'node:fs/promises';
import fs from 'node:fs';
import * as stream from 'stream';
import { promisify } from 'util';

const args = process.argv.slice(2);
if (!args[0]) {
  console.log('Plz put server ID and Token \`node index.js 753099492554702908 <token>\`');
  process.exit(1);
}

const [SERVER_ID, AUTH_TOKEN] = args;
console.log(SERVER_ID, AUTH_TOKEN);

const ROOT_API = 'https://discord.com/api/v9';

axios.defaults.baseURL = ROOT_API;
axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;

// Check server ID
try {
  const guilds = await axios
    .get(`/guilds/${SERVER_ID}`)
    .then((res) => res.data)
    .catch((error) => {
      if (error.response) {
        console.error(
          'Error on get guild data: ',
          error.response.statusText,
          error.response.status,
          error.response.data
        );
      } else {
        console.log(error);
      }
      process.exit(2);
    });

  console.log(`Server name: ${guilds.name}`);

  const path = `${guilds.name} (${guilds.id})`;
  await asyncfs.mkdir(path, { recursive: true });

  const emojis = await axios
    .get(`/guilds/${SERVER_ID}/emojis`)
    .then((res) => res.data);

  console.log(`Number of emojis: ${emojis.length}`);
  console.log(emojis[0]);
  const tasks = [];
  for (const emoji of emojis) {
    const ext = emoji.animated ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=240&quality=lossless`;
    const filename = `${emoji.name}.${ext}`;
    const pathFile = `${path}/${filename}`;

    console.log(ext, filename, pathFile, url);
    tasks.push(downloadFile(url, pathFile));
  }
  // await Promise.allSettled(tasks);
  await Promise.all(tasks);
  console.log('Done');
} catch (error) {
  console.error(error);
  process.exit(1);
}

async function downloadFile(fileUrl, outputLocationPath) {
  const finished = promisify(stream.finished);
  const writer = fs.createWriteStream(outputLocationPath);
  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then((response) => {
    response.data.pipe(writer);
    return finished(writer);
  });
}
