/*
 * DialogueUI.cs — Chat-style dialogue panel for NPC conversations.
 *
 * SETUP:
 *   1. Create a Canvas (Screen Space - Overlay)
 *   2. Create a Panel inside it (the dialogue panel)
 *   3. Inside the panel, add: a Text for NPC name, a ScrollView for messages,
 *      an InputField for player input, and a Send button
 *   4. Attach this script to the Panel
 *   5. Wire up the references in the Inspector
 *
 *   OR: Just attach to any GameObject and it creates the UI automatically.
 */

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Chat-style dialogue UI that sends player text to AAPM and displays NPC responses.
/// </summary>
public class DialogueUI : MonoBehaviour
{
    [Header("UI References (auto-created if empty)")]
    public GameObject dialoguePanel;
    public Text npcNameText;
    public Text npcMoodText;
    public Transform messageContainer;
    public InputField playerInput;
    public Button sendButton;
    public Button endButton;
    public ScrollRect scrollRect;

    [Header("Message Prefabs")]
    public GameObject playerMessagePrefab;
    public GameObject npcMessagePrefab;
    public GameObject systemMessagePrefab;

    [Header("Settings")]
    public Color playerBubbleColor = new Color(0.2f, 0.5f, 1f, 0.9f);
    public Color npcBubbleColor = new Color(0.15f, 0.15f, 0.2f, 0.9f);
    public Color systemBubbleColor = new Color(0.3f, 0.2f, 0.1f, 0.9f);
    public Color frictionColor = new Color(1f, 0.4f, 0.3f, 1f);

    // ─── State ────────────────────────────────────────────────

    private string _currentNpcId;
    private string _currentNpcName;
    private bool _isOpen = false;
    private readonly List<GameObject> _messageObjects = new List<GameObject>();

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        if (dialoguePanel == null)
        {
            CreateDefaultUI();
        }

        dialoguePanel.SetActive(false);

        // Wire up button events
        sendButton?.onClick.AddListener(OnSendClicked);
        endButton?.onClick.AddListener(OnEndClicked);
        playerInput?.onEndEdit.AddListener(OnInputSubmit);

        // Listen for AAPM messages
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived += HandleBridgeMessage;
        }
    }

    void OnDestroy()
    {
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived -= HandleBridgeMessage;
        }
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>Open the dialogue panel for a specific NPC</summary>
    public void OpenDialogue(string npcId, string npcName)
    {
        _currentNpcId = npcId;
        _currentNpcName = npcName;
        _isOpen = true;

        ClearMessages();
        dialoguePanel.SetActive(true);
        
        if (npcNameText != null) npcNameText.text = npcName;
        
        AddSystemMessage($"Conversation with {npcName}");

        // Focus the input field
        playerInput?.Select();
        playerInput?.ActivateInputField();

        // Disable player movement during dialogue
        var player = FindObjectOfType<PlayerController>();
        if (player != null) player.SetMovementEnabled(false);

        Debug.Log($"[DialogueUI] Opened dialogue with {npcName}");
    }

    /// <summary>Close the dialogue panel</summary>
    public void CloseDialogue()
    {
        _isOpen = false;
        dialoguePanel.SetActive(false);

        // Re-enable player movement
        var player = FindObjectOfType<PlayerController>();
        if (player != null) player.SetMovementEnabled(true);

        Debug.Log("[DialogueUI] Closed");
    }

    // ─── Event Handlers ───────────────────────────────────────

    void OnSendClicked()
    {
        string text = playerInput.text.Trim();
        if (string.IsNullOrEmpty(text)) return;

        // Show the player's message
        AddPlayerMessage(text);

        // Send to AAPM
        AAPMBridge.Instance?.SendDialogueTurn(text);

        // Clear input
        playerInput.text = "";
        playerInput.Select();
        playerInput.ActivateInputField();
    }

    void OnInputSubmit(string text)
    {
        if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter))
        {
            OnSendClicked();
        }
    }

    void OnEndClicked()
    {
        // Ask AAPM to end the dialogue
        AAPMBridge.Instance?.EndDialogue(false); // Let AAPM decide if goal was achieved
        AddSystemMessage("Ending conversation...");
    }

    // ─── Bridge Message Handler ───────────────────────────────

    void HandleBridgeMessage(BridgeMessage msg)
    {
        switch (msg.type)
        {
            case "dialogue/started":
                // The backend confirmed dialogue start
                AddNPCMessage("¡Hola! Welcome. How can I help you?"); // NPC greeting
                if (npcMoodText != null) npcMoodText.text = "😊 Neutral";
                break;

            case "dialogue/npc-turn":
                // NPC response with rich data
                var turnData = JsonUtility.FromJson<DialogueTurnData>(JsonUtility.ToJson(msg.payload));
                if (turnData != null)
                {
                    AddNPCMessage(turnData.npcText);
                    
                    // Show friction events as inline corrections
                    if (turnData.frictionEvents != null)
                    {
                        foreach (var friction in turnData.frictionEvents)
                        {
                            AddFrictionMessage(friction.description, friction.targetForm);
                        }
                    }

                    // Show cultural alerts
                    if (turnData.culturalAlerts != null)
                    {
                        foreach (var alert in turnData.culturalAlerts)
                        {
                            AddSystemMessage($"⚠️ {alert.suggestion}");
                        }
                    }

                    // Update mood display
                    if (npcMoodText != null) npcMoodText.text = GetMoodEmoji(turnData.npcMood);
                }
                break;

            case "dialogue/ended":
                AddSystemMessage("─── Conversation ended ───");
                var endData = JsonUtility.FromJson<DialogueEndData>(JsonUtility.ToJson(msg.payload));
                if (endData?.outcome != null)
                {
                    AddSystemMessage(
                        $"Turns: {endData.outcome.totalTurns} | " +
                        $"Goal: {(endData.outcome.goalAchieved ? "✅" : "❌")} | " +
                        $"Rep: {(endData.outcome.reputationDelta >= 0 ? "+" : "")}{endData.outcome.reputationDelta}"
                    );
                }

                // Close after a short delay
                Invoke(nameof(CloseDialogue), 3f);
                break;
        }
    }

    // ─── Message Display ──────────────────────────────────────

    void AddPlayerMessage(string text)
    {
        AddBubble("You", text, playerBubbleColor, TextAnchor.UpperRight);
    }

    void AddNPCMessage(string text)
    {
        AddBubble(_currentNpcName ?? "NPC", text, npcBubbleColor, TextAnchor.UpperLeft);
    }

    void AddSystemMessage(string text)
    {
        AddBubble("", text, systemBubbleColor, TextAnchor.MiddleCenter, italic: true);
    }

    void AddFrictionMessage(string description, string targetForm)
    {
        string msg = targetForm != null
            ? $"💡 {description} → try: \"{targetForm}\""
            : $"💡 {description}";
        AddBubble("", msg, new Color(1f, 0.8f, 0.2f, 0.3f), TextAnchor.MiddleCenter, italic: true);
    }

    void AddBubble(string sender, string content, Color bgColor, TextAnchor alignment, bool italic = false)
    {
        if (messageContainer == null) return;

        var go = new GameObject("Message");
        go.transform.SetParent(messageContainer, false);

        var layout = go.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(8, 8, 4, 4);
        layout.childForceExpandWidth = true;

        // Background
        var bg = go.AddComponent<Image>();
        bg.color = bgColor;

        // Add rounded corners via mask if available
        var fitter = go.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        // Sender label
        if (!string.IsNullOrEmpty(sender))
        {
            var senderGO = new GameObject("Sender");
            senderGO.transform.SetParent(go.transform, false);
            var senderText = senderGO.AddComponent<Text>();
            senderText.text = sender;
            senderText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            senderText.fontSize = 11;
            senderText.color = new Color(1, 1, 1, 0.5f);
            senderText.alignment = alignment;
        }

        // Content
        var contentGO = new GameObject("Content");
        contentGO.transform.SetParent(go.transform, false);
        var contentText = contentGO.AddComponent<Text>();
        contentText.text = content;
        contentText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        contentText.fontSize = 14;
        contentText.color = Color.white;
        contentText.fontStyle = italic ? FontStyle.Italic : FontStyle.Normal;
        contentText.alignment = alignment;

        _messageObjects.Add(go);

        // Scroll to bottom
        Canvas.ForceUpdateCanvases();
        if (scrollRect != null) scrollRect.verticalNormalizedPosition = 0f;
    }

    void ClearMessages()
    {
        foreach (var obj in _messageObjects)
        {
            Destroy(obj);
        }
        _messageObjects.Clear();
    }

    string GetMoodEmoji(string mood)
    {
        switch (mood?.ToLower())
        {
            case "happy": return "😊 Happy";
            case "neutral": return "😐 Neutral";
            case "annoyed": return "😒 Annoyed";
            case "angry": return "😠 Frustrated";
            case "impressed": return "🤩 Impressed";
            default: return $"🙂 {mood ?? "Unknown"}";
        }
    }

    // ─── Auto UI Creation ─────────────────────────────────────

    void CreateDefaultUI()
    {
        // This creates a basic dialogue panel programmatically
        // In production, you'd design this in the Unity Editor
        var canvas = FindObjectOfType<Canvas>();
        if (canvas == null)
        {
            var canvasGO = new GameObject("DialogueCanvas");
            canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGO.AddComponent<CanvasScaler>();
            canvasGO.AddComponent<GraphicRaycaster>();
        }

        dialoguePanel = new GameObject("DialoguePanel");
        dialoguePanel.transform.SetParent(canvas.transform, false);
        var panelRect = dialoguePanel.AddComponent<RectTransform>();
        panelRect.anchorMin = new Vector2(0.6f, 0f);
        panelRect.anchorMax = new Vector2(1f, 1f);
        panelRect.offsetMin = Vector2.zero;
        panelRect.offsetMax = Vector2.zero;
        var panelImg = dialoguePanel.AddComponent<Image>();
        panelImg.color = new Color(0.05f, 0.05f, 0.1f, 0.92f);

        Debug.Log("[DialogueUI] Auto-created basic dialogue panel");
    }
}

// ─── Response Data Types ──────────────────────────────────────

[Serializable]
public class DialogueTurnData
{
    public string npcText;
    public string npcMood;
    public FrictionEvent[] frictionEvents;
    public CulturalAlert[] culturalAlerts;
    public string[] refractions;
    public int turnNumber;
}

[Serializable]
public class FrictionEvent
{
    public string type;
    public string description;
    public float severity;
    public string targetForm;
    public string learnerProduction;
}

[Serializable]
public class CulturalAlert
{
    public string violationType;
    public string severity;
    public string suggestion;
}

[Serializable]
public class DialogueEndData
{
    public DialogueOutcome outcome;
    public RetentionItem[] retentionItems;
}

[Serializable]
public class DialogueOutcome
{
    public bool goalAchieved;
    public int totalTurns;
    public float reputationDelta;
    public int frictionCount;
    public float registerAccuracy;
    public string finalMood;
}

[Serializable]
public class RetentionItem
{
    public string form;
    public long nextReviewTime;
}
