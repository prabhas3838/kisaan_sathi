const { io } = require("socket.io-client");

const socket = io("http://localhost:5001");
const AUCTION_ID = "69776f6759b2f4a080ac770b";

socket.on("connect", () => {
  console.log("Connected to socket server");

  socket.emit("joinAuction", AUCTION_ID);

  setTimeout(() => {
    socket.emit("placeBid", {
      auctionId: AUCTION_ID,
      buyerId: "69776cf22a82784ad03b36a8",
      amount: 2400
    });
  }, 1000);
});

socket.on("newBid", (data) => {
  console.log("New bid received:", data);
});

// Keep process alive for observation
setTimeout(() => {
  console.log("Test finished");
  socket.disconnect();
}, 5000);
