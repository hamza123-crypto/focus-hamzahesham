import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface PollsSectionProps {
  projectId: string;
  canEdit: boolean;
}

export function PollsSection({ projectId, canEdit }: PollsSectionProps) {
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: "",
    options: ["", ""],
    deadline: "",
  });

  const polls = useQuery(api.polls.getPolls, { projectId: projectId as any });
  const createPoll = useMutation(api.polls.createPoll);
  const vote = useMutation(api.polls.vote);
  const closePoll = useMutation(api.polls.closePoll);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoll.question.trim()) {
      toast.error("Poll question is required");
      return;
    }

    const validOptions = newPoll.options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      toast.error("Poll must have at least 2 options");
      return;
    }

    try {
      await createPoll({
        projectId: projectId as any,
        question: newPoll.question,
        options: validOptions,
        deadline: newPoll.deadline ? new Date(newPoll.deadline).getTime() : undefined,
      });

      setNewPoll({
        question: "",
        options: ["", ""],
        deadline: "",
      });
      setShowCreatePoll(false);
      toast.success("Poll created successfully!");
    } catch (error) {
      toast.error("Failed to create poll");
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await vote({ pollId: pollId as any, optionId });
      toast.success("Vote recorded!");
    } catch (error: any) {
      toast.error(error.message || "Failed to vote");
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await closePoll({ pollId: pollId as any });
      toast.success("Poll closed!");
    } catch (error) {
      toast.error("Failed to close poll");
    }
  };

  const addOption = () => {
    setNewPoll({
      ...newPoll,
      options: [...newPoll.options, ""]
    });
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...newPoll.options];
    updatedOptions[index] = value;
    setNewPoll({
      ...newPoll,
      options: updatedOptions
    });
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      const updatedOptions = newPoll.options.filter((_, i) => i !== index);
      setNewPoll({
        ...newPoll,
        options: updatedOptions
      });
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Polls</h2>
          <p className="text-gray-600">Make decisions together with team voting</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreatePoll(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Poll
          </button>
        )}
      </div>

      {/* Polls List */}
      <div className="space-y-6">
        {polls?.map((poll) => (
          <div key={poll._id} className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{poll.question}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>by {poll.creator?.name || "Unknown"}</span>
                  <span>{poll.voters.length} votes</span>
                  {poll.deadline && (
                    <span>
                      Ends {new Date(poll.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {poll.isActive && (!poll.deadline || poll.deadline > Date.now()) ? (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    Active
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                    Closed
                  </span>
                )}
              </div>
            </div>

            {/* Poll Options */}
            <div className="space-y-3">
              {poll.options.map((option: any) => {
                const percentage = poll.voters.length > 0 
                  ? Math.round((option.votes / poll.voters.length) * 100) 
                  : 0;

                return (
                  <div key={option.id} className="relative">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{option.text}</span>
                          <span className="text-sm text-gray-600">
                            {option.votes} votes ({percentage}%)
                          </span>
                        </div>
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      {!poll.hasVoted && poll.isActive && (!poll.deadline || poll.deadline > Date.now()) && (
                        <button
                          onClick={() => handleVote(poll._id, option.id)}
                          className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Vote
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {poll.hasVoted && (
              <div className="mt-3 text-sm text-green-600 font-medium">
                ✓ You have voted on this poll
              </div>
            )}

            {canEdit && poll.isActive && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleClosePoll(poll._id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Close Poll
                </button>
              </div>
            )}
          </div>
        ))}

        {polls?.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-5xl mb-4">🗳️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No polls yet
            </h3>
            <p className="text-gray-600">
              Create a poll to gather team input on decisions
            </p>
          </div>
        )}
      </div>

      {/* Create Poll Modal */}
      {showCreatePoll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New Poll</h3>
              <button
                onClick={() => setShowCreatePoll(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poll Question *
                </label>
                <input
                  type="text"
                  value={newPoll.question}
                  onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What should we decide on?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Options *
                </label>
                {newPoll.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${index + 1}`}
                    />
                    {newPoll.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-700 px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Option
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={newPoll.deadline}
                  onChange={(e) => setNewPoll({ ...newPoll, deadline: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePoll(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
