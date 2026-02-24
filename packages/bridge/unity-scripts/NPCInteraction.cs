/*
 * NPCInteraction.cs — Attach to each NPC GameObject in the Unity scene.
 *
 * SETUP:
 *   1. Drop your NPC character model into the scene
 *   2. Add a Collider (SphereCollider or CapsuleCollider) set to "Is Trigger"
 *   3. Attach this script
 *   4. Set the NPC ID and Location ID in the Inspector
 *   5. The player must have a "Player" tag
 *
 * When the player enters the trigger zone, a UI prompt appears.
 * When they press E, it starts a dialogue via the AAPM bridge.
 */

using System;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Handles player ↔ NPC proximity detection and dialogue triggering.
/// </summary>
public class NPCInteraction : MonoBehaviour
{
    [Header("NPC Identity")]
    [Tooltip("Must match the NPC ID in your AAPM persona schema")]
    public string npcId = "npc_barista_carlos";
    
    [Tooltip("Display name shown in dialogue UI")]
    public string npcDisplayName = "Carlos";
    
    [Tooltip("Location ID where this NPC is placed")]
    public string locationId = "cafe_barcelona";

    [Header("Interaction Settings")]
    [Tooltip("Key to start dialogue")]
    public KeyCode interactKey = KeyCode.E;
    
    [Tooltip("Radius at which the interact prompt appears")]
    public float interactionRadius = 3f;
    
    [Tooltip("Default dialogue goal")]
    public string defaultGoal = "Order a coffee in Spanish";

    [Header("UI References")]
    [Tooltip("The prompt text that says 'Press E to talk'")]
    public GameObject interactPrompt;

    // ─── State ────────────────────────────────────────────────

    private bool _playerInRange = false;
    private bool _inDialogue = false;
    private Transform _playerTransform;

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        // Create interact prompt if not assigned
        if (interactPrompt == null)
        {
            interactPrompt = CreateDefaultPrompt();
        }
        interactPrompt.SetActive(false);

        // Ensure collider is trigger
        var collider = GetComponent<Collider>();
        if (collider == null)
        {
            var sphere = gameObject.AddComponent<SphereCollider>();
            sphere.isTrigger = true;
            sphere.radius = interactionRadius;
        }

        // Listen for AAPM messages
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived += HandleBridgeMessage;
        }
    }

    void Update()
    {
        if (_playerInRange && !_inDialogue && Input.GetKeyDown(interactKey))
        {
            StartDialogueWithNPC();
        }

        // Face the player when in range
        if (_playerInRange && _playerTransform != null)
        {
            Vector3 lookDir = _playerTransform.position - transform.position;
            lookDir.y = 0;
            if (lookDir.sqrMagnitude > 0.01f)
            {
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    Quaternion.LookRotation(lookDir),
                    Time.deltaTime * 3f
                );
            }
        }
    }

    void OnDestroy()
    {
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived -= HandleBridgeMessage;
        }
    }

    // ─── Trigger Zone ─────────────────────────────────────────

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            _playerInRange = true;
            _playerTransform = other.transform;
            interactPrompt.SetActive(true);

            // Notify AAPM about proximity
            AAPMBridge.Instance?.ApproachNPC(npcId, locationId);

            Debug.Log($"[NPC] Player approached {npcDisplayName}");
        }
    }

    void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            _playerInRange = false;
            _playerTransform = null;
            interactPrompt.SetActive(false);

            Debug.Log($"[NPC] Player left {npcDisplayName}");
        }
    }

    // ─── Dialogue ─────────────────────────────────────────────

    void StartDialogueWithNPC()
    {
        _inDialogue = true;
        interactPrompt.SetActive(false);

        Debug.Log($"[NPC] Starting dialogue with {npcDisplayName}: \"{defaultGoal}\"");

        // Tell AAPM to start the dialogue
        AAPMBridge.Instance?.StartDialogue(npcId, defaultGoal);

        // Open the dialogue UI
        DialogueUI dialogue = FindObjectOfType<DialogueUI>();
        if (dialogue != null)
        {
            dialogue.OpenDialogue(npcId, npcDisplayName);
        }
    }

    void HandleBridgeMessage(BridgeMessage msg)
    {
        if (msg.type == "dialogue/ended")
        {
            _inDialogue = false;
            Debug.Log($"[NPC] Dialogue with {npcDisplayName} ended");
        }
    }

    // ─── Default Prompt UI ────────────────────────────────────

    GameObject CreateDefaultPrompt()
    {
        // Create a world-space canvas above the NPC
        var canvasGO = new GameObject("InteractPrompt");
        canvasGO.transform.SetParent(transform);
        canvasGO.transform.localPosition = new Vector3(0, 2.2f, 0);

        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.WorldSpace;
        canvas.GetComponent<RectTransform>().sizeDelta = new Vector2(2f, 0.5f);

        var textGO = new GameObject("Text");
        textGO.transform.SetParent(canvasGO.transform);

        var text = textGO.AddComponent<Text>();
        text.text = $"Press E to talk to {npcDisplayName}";
        text.alignment = TextAnchor.MiddleCenter;
        text.fontSize = 14;
        text.color = Color.white;
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        
        var rectTransform = text.GetComponent<RectTransform>();
        rectTransform.sizeDelta = new Vector2(2f, 0.5f);
        rectTransform.localPosition = Vector3.zero;
        rectTransform.localScale = new Vector3(0.01f, 0.01f, 0.01f);

        return canvasGO;
    }
}
