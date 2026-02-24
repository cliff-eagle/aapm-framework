/*
 * AAPMBridge.cs — WebSocket client that connects Unity to the AAPM backend.
 *
 * SETUP:
 *   1. Create an empty GameObject in your Unity scene
 *   2. Attach this script to it
 *   3. Set the Server URL to ws://localhost:8765
 *   4. This object persists across scene loads (DontDestroyOnLoad)
 *
 * USAGE:
 *   AAPMBridge.Instance.SendMessage("dialogue/turn", new { text = "Hola" });
 *   AAPMBridge.Instance.OnMessageReceived += HandleMessage;
 */

using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

/// <summary>
/// Singleton WebSocket client for AAPM Bridge communication.
/// Attach to a persistent GameObject in your scene.
/// </summary>
public class AAPMBridge : MonoBehaviour
{
    [Header("Server Configuration")]
    [Tooltip("WebSocket URL of the AAPM Bridge Server")]
    public string serverUrl = "ws://localhost:8765";
    
    [Tooltip("Auto-reconnect on disconnect")]
    public bool autoReconnect = true;
    
    [Tooltip("Reconnect interval in seconds")]
    public float reconnectInterval = 3f;

    // ─── Singleton ────────────────────────────────────────────

    public static AAPMBridge Instance { get; private set; }

    // ─── Events ───────────────────────────────────────────────

    /// <summary>Fired when a message is received from AAPM backend</summary>
    public event Action<BridgeMessage> OnMessageReceived;
    
    /// <summary>Fired when connection state changes</summary>
    public event Action<bool> OnConnectionChanged;
    
    /// <summary>Fired when an error occurs</summary>
    public event Action<string> OnError;

    // ─── State ────────────────────────────────────────────────

    public bool IsConnected { get; private set; }
    public string SessionId { get; set; }

    // ─── Internal ─────────────────────────────────────────────

    private WebSocketSharp.WebSocket _ws;
    private readonly Queue<string> _messageQueue = new Queue<string>();
    private readonly object _queueLock = new object();
    private bool _shouldReconnect = false;
    private int _messageCounter = 0;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void Start()
    {
        Connect();
    }

    void Update()
    {
        // Process queued messages on the main thread
        lock (_queueLock)
        {
            while (_messageQueue.Count > 0)
            {
                string raw = _messageQueue.Dequeue();
                try
                {
                    var msg = JsonUtility.FromJson<BridgeMessage>(raw);
                    OnMessageReceived?.Invoke(msg);
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"[AAPMBridge] Failed to parse message: {e.Message}");
                }
            }
        }
    }

    void OnDestroy()
    {
        Disconnect();
    }

    // ─── Connection ───────────────────────────────────────────

    public void Connect()
    {
        if (_ws != null)
        {
            _ws.Close();
            _ws = null;
        }

        Debug.Log($"[AAPMBridge] Connecting to {serverUrl}...");

        _ws = new WebSocketSharp.WebSocket(serverUrl);

        _ws.OnOpen += (sender, e) =>
        {
            Debug.Log("[AAPMBridge] ✅ Connected to AAPM Bridge Server");
            IsConnected = true;
            _shouldReconnect = false;
            
            // Must invoke Unity events on main thread
            lock (_queueLock)
            {
                _messageQueue.Enqueue("{\"type\":\"__connected__\",\"id\":\"0\",\"payload\":{},\"timestamp\":0}");
            }
        };

        _ws.OnMessage += (sender, e) =>
        {
            lock (_queueLock)
            {
                _messageQueue.Enqueue(e.Data);
            }
        };

        _ws.OnClose += (sender, e) =>
        {
            Debug.Log($"[AAPMBridge] Disconnected: {e.Reason}");
            IsConnected = false;
            
            if (autoReconnect && !_shouldReconnect)
            {
                _shouldReconnect = true;
                StartCoroutine(ReconnectLoop());
            }
        };

        _ws.OnError += (sender, e) =>
        {
            Debug.LogError($"[AAPMBridge] Error: {e.Message}");
            OnError?.Invoke(e.Message);
        };

        _ws.ConnectAsync();
    }

    public void Disconnect()
    {
        _shouldReconnect = false;
        autoReconnect = false;
        if (_ws != null)
        {
            _ws.Close();
            _ws = null;
        }
        IsConnected = false;
    }

    IEnumerator ReconnectLoop()
    {
        while (_shouldReconnect && !IsConnected)
        {
            Debug.Log($"[AAPMBridge] Reconnecting in {reconnectInterval}s...");
            yield return new WaitForSeconds(reconnectInterval);
            if (!IsConnected && _shouldReconnect)
            {
                Connect();
            }
        }
    }

    // ─── Send Messages ────────────────────────────────────────

    /// <summary>
    /// Send a typed message to the AAPM backend.
    /// </summary>
    /// <param name="type">Message type (e.g., "session/init", "dialogue/turn")</param>
    /// <param name="payload">Payload object (will be serialized to JSON)</param>
    /// <returns>Message ID for correlation</returns>
    public string Send(string type, object payload)
    {
        if (!IsConnected || _ws == null)
        {
            Debug.LogWarning("[AAPMBridge] Not connected — message dropped");
            return null;
        }

        string msgId = (++_messageCounter).ToString();
        var msg = new BridgeMessage
        {
            type = type,
            id = msgId,
            payload = payload,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        string json = JsonUtility.ToJson(msg);
        _ws.Send(json);
        return msgId;
    }

    // ─── Convenience Methods ──────────────────────────────────

    /// <summary>Initialize a session with the AAPM backend</summary>
    public void InitSession(string schemaId, string learnerId, string learnerL1, string learnerL2, string cefrLevel)
    {
        Send("session/init", new SessionInitPayload
        {
            schemaId = schemaId,
            learnerId = learnerId,
            learnerL1 = learnerL1,
            learnerL2 = learnerL2,
            cefrLevel = cefrLevel
        });
    }

    /// <summary>Approach an NPC (triggers info response)</summary>
    public void ApproachNPC(string npcId, string locationId)
    {
        Send("npc/approach", new NPCApproachPayload { npcId = npcId, locationId = locationId });
    }

    /// <summary>Start dialogue with an NPC</summary>
    public void StartDialogue(string npcId, string goal)
    {
        Send("dialogue/start", new DialogueStartPayload { npcId = npcId, goal = goal });
    }

    /// <summary>Send a dialogue turn (what the player said)</summary>
    public void SendDialogueTurn(string text)
    {
        Send("dialogue/turn", new DialogueTurnPayload { text = text });
    }

    /// <summary>End the current dialogue</summary>
    public void EndDialogue(bool goalAchieved)
    {
        Send("dialogue/end", new DialogueEndPayload { goalAchieved = goalAchieved });
    }

    /// <summary>Navigate to a new location</summary>
    public void Navigate(string targetLocationId)
    {
        Send("navigate", new NavigatePayload { targetLocationId = targetLocationId });
    }
}

// ─── Serializable Message Types ───────────────────────────────

[Serializable]
public class BridgeMessage
{
    public string type;
    public string id;
    public object payload;
    public long timestamp;
}

[Serializable] public class SessionInitPayload { public string schemaId; public string learnerId; public string learnerL1; public string learnerL2; public string cefrLevel; }
[Serializable] public class NPCApproachPayload { public string npcId; public string locationId; }
[Serializable] public class DialogueStartPayload { public string npcId; public string goal; public string[] injectionTargets; }
[Serializable] public class DialogueTurnPayload { public string text; public string audioBase64; }
[Serializable] public class DialogueEndPayload { public bool goalAchieved; }
[Serializable] public class NavigatePayload { public string targetLocationId; }
