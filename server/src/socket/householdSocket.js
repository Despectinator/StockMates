const Household = require("../models/Household");
const mongoose = require("mongoose");

// A user may open the app in more than one tab, so presence is reference
// counted and "offline" is broadcast only after their last socket disconnects.
const onlineUsersByHousehold = new Map();

const addOnlineUser = (householdId, userId) => {
  if (!onlineUsersByHousehold.has(householdId)) {
    onlineUsersByHousehold.set(householdId, new Map());
  }

  const users = onlineUsersByHousehold.get(householdId);
  const count = users.get(userId) || 0;
  users.set(userId, count + 1);
  return count === 0;
};

const removeOnlineUser = (householdId, userId) => {
  const users = onlineUsersByHousehold.get(householdId);
  if (!users) return false;

  const count = users.get(userId) || 0;

  if (count <= 1) {
    users.delete(userId);
    if (users.size === 0) onlineUsersByHousehold.delete(householdId);
    return true;
  }

  users.set(userId, count - 1);
  return false;
};

const removeUserFromHousehold = (io, householdId, userId) => {
  const householdRoom = `household:${householdId}`;
  const userIdString = String(userId);

  for (const socket of io.sockets.sockets.values()) {
    if (
      String(socket.data.userId) === userIdString &&
      socket.data.householdId === String(householdId)
    ) {
      socket.leave(householdRoom);
      delete socket.data.householdId;

      if (removeOnlineUser(String(householdId), userIdString)) {
        io.to(householdRoom).emit("presence:offline", {
          userId: userIdString,
        });
      }

      socket.emit("household:removed", {
        householdId: String(householdId),
      });
    }
  }
};

const setupHouseholdSocket = (io) => {
  io.on("connection", (socket) => {
    const leaveActiveHousehold = () => {
      const householdId = socket.data.householdId;
      if (!householdId) return;

      const householdRoom = `household:${householdId}`;
      socket.leave(householdRoom);
      delete socket.data.householdId;

      if (removeOnlineUser(householdId, socket.data.userId)) {
        io.to(householdRoom).emit("presence:offline", {
          userId: socket.data.userId,
        });
      }
    };

    socket.data.userId = String(socket.user.userId);

    socket.on("household:join", async ({ householdId } = {}) => {
      try {
        if (!mongoose.isValidObjectId(householdId)) return;

        const household = await Household.exists({
          _id: householdId,
          "members.user": socket.user.userId,
        });

        if (!household) return;

        if (socket.data.householdId === householdId) {
          socket.emit("presence:list", {
            onlineUserIds: Array.from(
              (onlineUsersByHousehold.get(householdId) || new Map()).keys()
            ),
          });
          return;
        }

        leaveActiveHousehold();

        const householdRoom = `household:${householdId}`;
        socket.join(householdRoom);
        socket.data.householdId = householdId;

        const isFirstConnection = addOnlineUser(householdId, socket.data.userId);

        socket.emit("presence:list", {
          onlineUserIds: Array.from(
            (onlineUsersByHousehold.get(householdId) || new Map()).keys()
          ),
        });

        if (isFirstConnection) {
          socket.to(householdRoom).emit("presence:online", {
            userId: socket.data.userId,
          });
        }
      } catch (error) {
        console.error("Socket household join error:", error);
      }
    });

    socket.on("household:leave", ({ householdId } = {}) => {
      if (socket.data.householdId === householdId) leaveActiveHousehold();
    });

    socket.on("disconnect", leaveActiveHousehold);
  });
};

module.exports = {
  setupHouseholdSocket,
  removeUserFromHousehold,
};
