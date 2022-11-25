import net from 'net';
import config from 'config';
import dgram from 'dgram';
import fs from 'fs';
import express from 'express';
import path from 'path';
import engines from 'consolidate';
import cors from 'cors';
import ws from 'ws';

const PORT: number = 50051;
const HOST: string = config.get('TCPHost');
let socketMapData: WebSocket | null = null;
let socketMapDataFreq: number = 200;

// TCP Server

let TCPEvents: any = {};
const sockets: net.Socket[] = [];
const server = net.createServer();

server.listen(PORT, HOST, () => console.log(`TCP Server running on port ${PORT}`));

server.on('connection', (socket) => {
    console.log(`Подключен: ${socket.remoteAddress}:${socket.remotePort}`);

    sockets.push(socket);

    socket.on('data', (buffer) => {
        try {
            TCPEvents = JSON.parse(buffer.toString());

            console.log(TCPEvents);

            const kills = TCPEvents.events.kill;

            // kills.forEach((item) => );
        } catch (error) {
            console.log(`Некорректный запрос на удаление: ${error.message}`);
        }
    });

    socket.on('error', (error) => console.log(`Ошибка: ${error.message}`));

    socket.on('close', (hadError) => {
        const index = sockets.findIndex((s) => s.remoteAddress === socket.remoteAddress && s.remotePort === socket.remotePort);

        if (index === -1) sockets.splice(index, 1);

        console.log(`Отключен: ${socket.remoteAddress}:${socket.remotePort}`)
    });
});

// UDP Client

const jsonData = {};

const getData = () => {
    const serverData = dgram.createSocket('udp4');

    serverData.on('error', () => serverData.close());

    serverData.on('message', (message, remoteInfo) => {
        try {
            const parsedMessage = JSON.parse(message.toString());

            parsedMessage.data.forEach((item, i) => jsonData[parsedMessage.data[i].id] = item);

            console.log(jsonData);
            console.log('-------------------------------------------');
            sendMapData(jsonData, socketMapData, socketMapDataFreq)
        } catch (error) {
            console.log(error.message);
        }
    });

    serverData.on('listening', () => {
        const address = serverData.address();
        console.log(`UDP listener is running on port ${address.port}`);
    });

    serverData.bind(50050);
};

// File System

const imageNames: string[] = [];
const imagesFolder = '../public/images';

fs.readdir(imagesFolder, (_, files) => {
    files.forEach((file) => imageNames.push(file));
});

// Express

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, 'views')));
app.use('/public', express.static(`${__dirname}/public`));
app.use(express.json());

app.engine('html', engines.mustache);

app.listen(3000, () => console.log('Server listening port 3000'));

setTimeout(getData, 0);

// ===================================================================
let block = false

function sendMapData(mapData: any, wsClient: WebSocket | null, freq: number) {
    if (block || socketMapData == null) return

    wsClient.send(JSON.stringify(mapData));
    block = true;

    setTimeout(() => { block = false }, freq)
}

const wsServer = new ws.Server({ port: 3001 });

wsServer.on('connection', onConnect);

function onConnect(wsClient) {
    console.log('connection up');
    wsClient.send('hello');

    wsClient.on('close', function () {
        console.log('connection close');
    });



}

console.log('Сервер запущен на 3001 порту');