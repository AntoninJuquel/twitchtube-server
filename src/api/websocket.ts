import ws from "ws";

const wss = new ws.Server({ port: 8080 });

console.log("websocket endpoint: ws://localhost:8080");

wss.on("connection", (client) => {
  client.on("message", (message) => {
    console.log(`Received message => ${message}`);
  });

  client.send("Hello! Message From Server!!");
});

export default wss;
