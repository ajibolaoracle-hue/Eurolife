using System;
using UnityEngine;

/// <summary>
/// Message data shared by future online chat transports.
/// This class does not send messages over a network by itself.
/// </summary>
[Serializable]
public class PlayerChatMessage
{
    public string messageId;
    public string senderPlayerId;
    public string senderDisplayName;
    public string conversationId;
    public string text;
    public long sentUtcUnix;
    public bool flagged;

    public static bool TryCreate(string senderId, string senderName, string conversation,
        string messageText, out PlayerChatMessage message, out string error)
    {
        message = null;
        error = null;

        if (string.IsNullOrWhiteSpace(senderId))
        {
            error = "A signed-in player ID is required.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(conversation))
        {
            error = "A conversation ID is required.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(messageText))
        {
            error = "Message cannot be empty.";
            return false;
        }

        string clean = messageText.Trim();
        if (clean.Length > 500)
        {
            error = "Messages are limited to 500 characters.";
            return false;
        }

        message = new PlayerChatMessage
        {
            messageId = Guid.NewGuid().ToString("N"),
            senderPlayerId = senderId,
            senderDisplayName = string.IsNullOrWhiteSpace(senderName) ? "Player" : senderName.Trim(),
            conversationId = conversation,
            text = clean,
            sentUtcUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            flagged = false
        };
        return true;
    }
}
