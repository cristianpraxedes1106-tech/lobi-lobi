class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code;
        do {
            code = '';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }

    createRoom(hostId) {
        const roomCode = this.generateCode();
        this.rooms.set(roomCode, {
            hostId: hostId,
            code: roomCode,
            players: new Map(),
            isPlaying: false
        });
        return roomCode;
    }

    getRoom(roomCode) {
        return this.rooms.get(roomCode.toUpperCase());
    }

    addPlayer(roomCode, socketId, nickname) {
        const room = this.getRoom(roomCode);
        if (!room) return null;

        const player = {
            id: socketId,
            nickname: nickname.substring(0, 12), // Limita o tamanho do nome
            isReady: false,
            score: 0
        };
        room.players.set(socketId, player);
        return player;
    }

    setPlayerReady(roomCode, socketId) {
        const room = this.getRoom(roomCode);
        if (room && room.players.has(socketId)) {
            const player = room.players.get(socketId);
            player.isReady = true;
            return player;
        }
        return null;
    }

    areAllPlayersReady(roomCode) {
        const room = this.getRoom(roomCode);
        if (!room || room.players.size === 0) return false;
        
        for (let [_, player] of room.players) {
            if (!player.isReady) return false;
        }
        return true;
    }

    handleDisconnect(socketId, io) {
        // Busca se era host ou jogador e limpa a sala
        for (let [code, room] of this.rooms) {
            if (room.hostId === socketId) {
                // Host caiu: encerra a sala e avisa os jogadores
                io.to(code).emit('room:closed');
                this.rooms.delete(code);
                break;
            }
            if (room.players.has(socketId)) {
                // Jogador caiu: remove da sala e avisa o host
                room.players.delete(socketId);
                io.to(room.hostId).emit('host:playerLeft', socketId);
                break;
            }
        }
    }
}

module.exports = RoomManager;
