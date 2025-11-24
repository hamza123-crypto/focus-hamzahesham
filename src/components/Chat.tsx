import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface ChatProps {
  projectId: string;
}

export function Chat({ projectId }: ChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.chat.getMessages, { projectId: projectId as any });
  const sendMessage = useMutation(api.chat.sendMessage);
  const markAsRead = useMutation(api.chat.markAsRead);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage({
        projectId: projectId as any,
        content: newMessage,
        type: "text",
      });
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((message) => (
          <div key={message._id} className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {message.sender?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">
                  {message.sender?.name || message.sender?.email?.split("@")[0] || "Unknown User"}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(message._creationTime)}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        
        {messages?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message... (use @email to mention someone)"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </form>
        <div className="text-xs text-gray-500 mt-2">
          Tip: Use @email to mention team members
        </div>
      </div>
    </div>
  );
}