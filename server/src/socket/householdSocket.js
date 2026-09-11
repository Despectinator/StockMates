const Household = require("../models/Household");
const User = require("../models/User");
const mongoose = require("mongoose");

// A user may open the app in more than one tab, so presence is reference
// counted and "offline" is broadcast only after their last socket disconnects.
const onlineUsersByHousehold = new Map();

// "Someone is editing…" state: householdId -> Map(itemId -> { userId, userName }).
// Only tracked in memory — if the server restarts, in-progress edit
// indicators simply clear, which is the right failure mode here.
const editorsByHousehold = new Map();

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

// Clears every item this socket was editing (on disconnect, tab close, or
// leaving the household) and tells the rest of the household so the
// "editing…" badge doesn't get stuck on forever.
const stopAllEditing = (io, householdId, socket) => {
  if (!householdId || !socket.data.editingItemIds) return;

  const editors = editorsByHousehold.get(householdId);
  const householdRoom = `household:${householdId}`;

  for (const itemId of socket.data.editingItemIds) {
    if (editors) {
      const current = editors.get(itemId);
      if (current && current.userId === socket.data.userId) {
        editors.delete(itemId);
      }
    }
    io.to(householdRoom).emit("item:editing_stopped", {
      itemId,
      userId: socket.data.userId,
    });
  }

  if (editors && editors.size === 0) editorsByHousehold.delete(householdId);
  socket.data.editingItemIds.clear();
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

      stopAllEditing(io, String(householdId), socket);

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
    socket.data.userId = String(socket.user.userId);
    socket.data.editingItemIds = new Set();

    const leaveActiveHousehold = () => {
      const householdId = socket.data.householdId;
      if (!householdId) return;

      const householdRoom = `household:${householdId}`;

      stopAllEditing(io, householdId, socket);

      socket.leave(householdRoom);
      delete socket.data.householdId;

      if (removeOnlineUser(householdId, socket.data.userId)) {
        io.to(householdRoom).emit("presence:offline", {
          userId: socket.data.userId,
        });
      }
    };

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
          socket.emit("item:editing_list", {
            editors: Array.from(
              (editorsByHousehold.get(householdId) || new Map()).entries()
            ).map(([itemId, editor]) => ({ itemId, ...editor })),
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

        // Catch this socket up on anything already being edited so a
        // page refresh or a late join still shows the right badges.
        socket.emit("item:editing_list", {
          editors: Array.from(
            (editorsByHousehold.get(householdId) || new Map()).entries()
          ).map(([itemId, editor]) => ({ itemId, ...editor })),
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

    // Someone opened an item's edit form. Broadcast to the rest of the
    // household so their cards can show "<name> is editing…". The name is
    // looked up server-side rather than trusted from the client payload.
    socket.on("item:editing_start", async ({ itemId } = {}) => {
      try {
        const householdId = socket.data.householdId;
        if (!householdId || !mongoose.isValidObjectId(itemId)) return;

        const user = await User.findById(socket.data.userId).select("name");
        if (!user) return;

        if (!editorsByHousehold.has(householdId)) {
          editorsByHousehold.set(householdId, new Map());
        }
        editorsByHousehold.get(householdId).set(itemId, {
          userId: socket.data.userId,
          userName: user.name,
        });
        socket.data.editingItemIds.add(itemId);

        io.to(`household:${householdId}`).emit("item:editing_started", {
          itemId,
          userId: socket.data.userId,
          userName: user.name,
        });
      } catch (error) {
        console.error("Socket editing_start error:", error);
      }
    });

    socket.on("item:editing_stop", ({ itemId } = {}) => {
      const householdId = socket.data.householdId;
      if (!householdId || !itemId) return;

      const editors = editorsByHousehold.get(householdId);
      if (editors) {
        const current = editors.get(itemId);
        if (current && current.userId === socket.data.userId) {
          editors.delete(itemId);
          if (editors.size === 0) editorsByHousehold.delete(householdId);
        }
      }

      socket.data.editingItemIds.delete(itemId);

      io.to(`household:${householdId}`).emit("item:editing_stopped", {
        itemId,
        userId: socket.data.userId,
      });
    });

    socket.on("disconnect", leaveActiveHousehold);
  });
};

module.exports = {
  setupHouseholdSocket,
  removeUserFromHousehold,
};
