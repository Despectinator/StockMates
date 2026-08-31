const Household = require("../models/Household");

const setupHouseholdSocket = (io) => {
  io.on("connection", async (socket) => {
    try {
      const userId = socket.user.userId;

      const household = await Household.findOne({
        "members.user": userId,
      });

      if (!household) {
        console.log(`No household found for user: ${userId}`);
        return;
      }

      const householdRoom = `household:${household._id}`;

      if (socket.rooms.has(householdRoom)) {
        console.log(`User ${userId} already in socket room: ${householdRoom}`);
        return;
      }

      socket.join(householdRoom);

      console.log(
        `User ${userId} joined socket room: ${householdRoom}`
      );
    } catch (error) {
      console.error("Socket household setup error:", error);
    }
  });
};

module.exports = setupHouseholdSocket;
