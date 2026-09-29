const express = require("express");
const app = express();

//socket
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {  
  socket.on('join-room', ({ room }) => {
    socket.join(room)
  })
  socket.on("message", (message) => {
    io.emit("messages", message );
  });
});

//inicio del servidor
http.listen(3000, () => {
  console.log("Server Running");
});
