const wa = require("@open-wa/wa-automate");

wa.create({
  sessionId: "AMAZIO",
  multiDevice: true, //required to enable multiDevice support
  authTimeout: 60, //wait only 60 seconds to get a connection with the host account device
  blockCrashLogs: true,
  disableSpins: true,
  headless: true,
  hostNotificationLang: "PT_BR",
  logConsole: false,
  popup: true,
  port: 5004,
  qrTimeout: 0, //0 means it will wait forever for you to scan the qr code
}).then((client) => start(client));

function start(client) {
  client.onMessage(async (message) => {
    console.log(message.from);
    console.log(`Received a message from ${message.from.user}`);
    if (message.body === "Hi") {
      await client.sendText(
        message.from,
        "👋 Hello! I am Amazio your favourite sentiment analysis bot \n Let me know what you want to buy today"
      );
    }
  });
}
