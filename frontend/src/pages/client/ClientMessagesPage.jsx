import MessageThread from "../../components/messaging/MessageThread";

/**
 * Client portal Messages tab. The client has exactly ONE trainer → one
 * conversation, so no clientId is passed (the backend resolves the caller's
 * own conversation). The thread UI is the shared <MessageThread> component, so
 * it stays identical to the trainer's client-profile Messages tab.
 */
const ClientMessagesPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold text-text-primary">Messages</h2>
      <p className="text-sm text-text-secondary mt-1">Chat directly with your coach.</p>
    </div>
    <MessageThread fallbackName="Coach" />
  </div>
);

export default ClientMessagesPage;
