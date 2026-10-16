const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => callback(null, true),
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("join_room", (room) => {
            socket.join(room);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        return {
            emit: () => {},
            to: () => ({ emit: () => {} }),
        };
    }
    return io;
};

module.exports = { initSocket, getIO };