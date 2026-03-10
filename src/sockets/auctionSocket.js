const Auction = require("../models/Auction");
const { createNotification } = require("../controllers/notificationController");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Buyer/User connected for Auctions:", socket.id);

    // Join auction room (to see live bid updates)
    socket.on("joinAuction", (auctionId) => {
      socket.join(auctionId);
      console.log(`Socket ${socket.id} joined auction ${auctionId}`);
    });



    // Place bid (LIVE)
    socket.on("placeBid", async (data) => {
      const { auctionId, buyerId, amount } = data;

      try {
        const auction = await Auction.findById(auctionId).populate("farmerId");
        if (!auction || auction.status !== "OPEN") {
          socket.emit("bidError", "Auction closed or invalid");
          return;
        }

        if (amount < auction.basePrice) {
          socket.emit("bidError", "Bid below base price");
          return;
        }

        // Check for current highest bidder to notify them
        let previousHighestBidder = null;
        if (auction.bids.length > 0) {
          const highestBid = auction.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max, { amount: 0 });
          if (highestBid.amount >= amount) {
            socket.emit("bidError", "Bid amount must be higher than current highest bid");
            return;
          }
          previousHighestBidder = highestBid.buyerId;
        }

        auction.bids.push({ buyerId, amount });
        await auction.save();

        // Broadcast updated bids to ALL buyers in the auction room
        io.to(auctionId).emit("newBid", {
          auctionId,
          buyerId,
          amount
        });

        // 1. Notify Farmer (Real-time + DB)
        if (auction.farmerId) {
          await createNotification(io, {
            userId: auction.farmerId._id || auction.farmerId,
            role: "farmer",
            title: "New Bid Received",
            message: `A buyer placed a bid of ₹${amount} for your ${auction.crop}`,
            type: "auction",
            relatedEntityId: auctionId
          });
        }

        // 2. Notify Previous Highest Bidder (Outbid) (Real-time + DB)
        if (previousHighestBidder && previousHighestBidder.toString() !== buyerId) {
          await createNotification(io, {
            userId: previousHighestBidder,
            role: "buyer",
            title: "You've been outbid!",
            message: `Someone placed a higher bid of ₹${amount} on ${auction.crop}`,
            type: "auction",
            relatedEntityId: auctionId
          });
        }
      } catch (error) {
        console.error("BID_ERROR:", error);
        socket.emit("bidError", "Server error while placing bid");
      }
    });

    socket.on("disconnect", () => {
      console.log("Buyer disconnected from Auction socket:", socket.id);
    });
  });
};
