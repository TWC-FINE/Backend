require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();

//socket
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // los mensajes con imagen/audio en base64 pesan más que texto plano,
  // por eso subimos el límite por defecto (1 MB) a 10 MB.
  maxHttpBufferSize: 1e7,
});

//conexión a MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chat";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error conectando a MongoDB:", err));

//modelo del mensaje
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, default: "general" },
  type: {
    type: String,
    enum: ["text", "image", "audio"],
    required: true,
    default: "text",
  },
  // para "text" es el mensaje tal cual.
  // para "image"/"audio" es un data URL base64 (data:image/png;base64,... / data:audio/webm;base64,...)
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

io.on("connection", (socket) => {
  socket.on("join-room", async ({ room }) => {
    socket.join(room);
    socket.data.room = room; // guardamos la room actual del socket

    // enviamos el historial de esa room solo a este socket
    try {
      const history = await Message.find({ room })
        .sort({ createdAt: 1 })
        .limit(100);
      socket.emit("history", history);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    }
  });

  // data = { type: 'text' | 'image' | 'audio', content: string }
  socket.on("message", async (data) => {
    const room = socket.data.room || "general";

    if (!data || !data.content || !data.type) {
      return;
    }

    try {
      const saved = await Message.create({
        room,
        type: data.type,
        content: data.content,
      });

      // solo se emite a los sockets de esa room
      io.to(room).emit("messages", saved);
    } catch (err) {
      console.error("Error al guardar mensaje:", err);
    }
  });
});

//inicio del servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server Running en puerto ${PORT}`);
});