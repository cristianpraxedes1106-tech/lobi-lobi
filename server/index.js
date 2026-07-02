const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const RoomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const roomManager = new RoomManager();

// Servir arquivos estáticos
app.use(express.static('public'));
app.use('/games', express.static('games'));

io.on('connection', (socket) => {
    console.log(`Nova conexão: ${socket.id}`);

    // Host solicita criação de sala
    socket.on('host:createRoom', () => {
        const roomCode = roomManager.createRoom(socket.id);
        socket.join(roomCode);
        socket.emit('host:roomCreated', { roomCode });
    });

    // Jogador tenta entrar
    socket.on('player:join', ({ roomCode, nickname }) => {
        const room = roomManager.getRoom(roomCode);
        if (room && !room.isPlaying) {
            const player = roomManager.addPlayer(roomCode, socket.id, nickname);
            socket.join(roomCode);
            // Avisa o host que alguém entrou
            io.to(room.hostId).emit('host:playerJoined', player);
            socket.emit('player:joinedSuccess', player);
        } else {
            socket.emit('player:error', { message: 'Sala não encontrada ou em andamento.' });
        }
    });

    // Jogador marca como pronto
    socket.on('player:ready', ({ roomCode }) => {
        const player = roomManager.setPlayerReady(roomCode, socket.id);
        const room = roomManager.getRoom(roomCode);
        io.to(room.hostId).emit('host:playerReady', player);
        
        // Se todos prontos, avisa o host para liberar o botão de Start
        if (roomManager.areAllPlayersReady(roomCode)) {
            io.to(room.hostId).emit('host:allReady');
        }
    });

    socket.on('disconnect', () => {
        // Lógica de reconexão ou remoção de jogador/sala (limpeza automática)
        roomManager.handleDisconnect(socket.id, io);
    });
});

server.listen(3000, () => {
    console.log('Lóbi Lóbi Engine rodando na porta 3000');
});
