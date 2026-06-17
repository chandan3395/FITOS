"use strict";

/**
 * Delivery orchestration shared by the REST send/read controllers and the
 * socket handlers, so both follow the IDENTICAL persist-then-emit path:
 *
 *   1. message is already persisted (status "sent") by the service,
 *   2. emit "message:new" to the conversation room,
 *   3. if the recipient is currently online, flip "sent" → "delivered" in
 *      Mongo and emit a delivered receipt.
 *
 * Mongo stays the source of truth; if an emit is missed the status still
 * reconciles on the recipient's next connect (flushDeliveriesOnConnect).
 */

const presence = require("./presence");
const emit = require("./emit");
const conversationService = require("../services/conversation.service");

/** Emit a freshly-sent message and, if the recipient is online, deliver it. */
async function deliverNewMessage(result) {
  emit.emitMessageToConversation(result);

  if (result.recipientUserId && presence.isOnline(result.recipientUserId)) {
    const { messageIds, deliveredAt } = await conversationService.markDelivered(
      result.conversation._id,
      result.recipientRole
    );
    emit.emitDeliveredReceipt(result.conversation._id, { messageIds, deliveredAt });
  }
}

/** Emit a read receipt for messages the reader just marked read. */
function emitRead(conversationId, { messageIds, readerRole, readAt }) {
  emit.emitReadReceipt(conversationId, { messageIds, readerRole, readAt });
}

module.exports = { deliverNewMessage, emitRead };
