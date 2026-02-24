/*
 * NPCSpawner.cs — Creates NPC GameObjects from registry data.
 *
 * SETUP:
 *   1. Attach to a persistent GameObject
 *   2. Called by GameManager when player docks at a port
 *   3. Spawns NPCs at PortEnvironmentGenerator spawn points
 *   4. Each NPC gets NPCController + NPCInteraction components
 *
 * NPCs are procedurally generated with:
 *   - Capsule body with role-based colors
 *   - Floating name label
 *   - Interaction trigger
 *   - Cultural data from registry
 */

using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Spawns NPC GameObjects for the current port using registry data
/// and assigns them to spawn points from PortEnvironmentGenerator.
/// </summary>
public class NPCSpawner : MonoBehaviour
{
    [Header("NPC Appearance")]
    public float npcHeight = 1.8f;
    public float labelHeight = 2.5f;
    public float interactionRadius = 3f;

    // ─── Singleton ────────────────────────────────────────────

    public static NPCSpawner Instance { get; private set; }

    // ─── State ────────────────────────────────────────────────

    private readonly List<GameObject> _spawnedNPCs = new List<GameObject>();
    private readonly Dictionary<string, Color> _roleColors = new Dictionary<string, Color>
    {
        {"harbor-master",      new Color(0.2f, 0.3f, 0.5f)},   // Navy blue
        {"fisherman",          new Color(0.3f, 0.45f, 0.55f)},  // Sea blue
        {"taverna-owner",      new Color(0.6f, 0.3f, 0.15f)},   // Warm brown
        {"restaurant-owner",   new Color(0.6f, 0.3f, 0.15f)},   // Warm brown
        {"cafe-server",        new Color(0.4f, 0.3f, 0.25f)},   // Coffee
        {"guide",              new Color(0.3f, 0.5f, 0.3f)},    // Green
        {"tour-guide",         new Color(0.3f, 0.5f, 0.3f)},    // Green
        {"market-vendor",      new Color(0.6f, 0.45f, 0.2f)},   // Gold
        {"winemaker",          new Color(0.45f, 0.15f, 0.25f)},  // Wine red
        {"artisan",            new Color(0.5f, 0.4f, 0.3f)},    // Artisan tan
        {"musician",           new Color(0.5f, 0.2f, 0.4f)},    // Purple
        {"archaeologist",      new Color(0.5f, 0.45f, 0.35f)},  // Khaki
        {"dive-master",        new Color(0.1f, 0.35f, 0.5f)},   // Deep blue
        {"boat-captain",       new Color(0.25f, 0.3f, 0.45f)},  // Captain blue
        {"chef",               new Color(0.9f, 0.9f, 0.85f)},   // White (chef coat)
        {"customs-officer",    new Color(0.3f, 0.3f, 0.3f)},    // Grey
        {"monk",               new Color(0.2f, 0.15f, 0.1f)},   // Dark brown
        {"church-warden",      new Color(0.2f, 0.15f, 0.1f)},   // Dark brown
        {"bartender",          new Color(0.15f, 0.15f, 0.2f)},   // Black
        {"bar-owner",          new Color(0.15f, 0.15f, 0.2f)},   // Black
    };

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Spawn all NPCs for a port. Called when player docks.
    /// </summary>
    public void SpawnPortNPCs(PortData port, List<Transform> spawnPoints)
    {
        ClearNPCs();

        if (port == null || port.npcs == null || port.npcs.Count == 0)
        {
            Debug.LogWarning($"[NPCSpawner] No NPCs for port {port?.name}");
            return;
        }

        for (int i = 0; i < port.npcs.Count; i++)
        {
            NPCData npcData = port.npcs[i];

            // Determine spawn position
            Vector3 spawnPos;
            if (i < spawnPoints.Count)
            {
                spawnPos = spawnPoints[i].position;
            }
            else
            {
                // Overflow NPCs spawn in a circle around the port center
                float angle = (i - spawnPoints.Count) * 60f * Mathf.Deg2Rad;
                spawnPos = spawnPoints[0].position + new Vector3(
                    Mathf.Cos(angle) * 10f, 0, Mathf.Sin(angle) * 10f
                );
            }

            var npcGO = CreateNPC(npcData, spawnPos, port);
            _spawnedNPCs.Add(npcGO);
        }

        // Spawn crew members if they have a special at this port
        SpawnCrewSpecials(port, spawnPoints);

        Debug.Log($"[NPCSpawner] 👥 Spawned {_spawnedNPCs.Count} NPCs at {port.name}");
    }

    /// <summary>Destroy all spawned NPCs</summary>
    public void ClearNPCs()
    {
        foreach (var npc in _spawnedNPCs)
        {
            if (npc != null) Destroy(npc);
        }
        _spawnedNPCs.Clear();
    }

    // ─── NPC Creation ─────────────────────────────────────────

    GameObject CreateNPC(NPCData data, Vector3 position, PortData port)
    {
        var npc = new GameObject($"NPC_{data.name}");
        npc.transform.position = position;
        npc.layer = LayerMask.NameToLayer("Default");

        // ─── Body (capsule) ───────────────────────────────
        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.name = "Body";
        body.transform.SetParent(npc.transform, false);
        body.transform.localPosition = new Vector3(0, npcHeight / 2f, 0);
        body.transform.localScale = new Vector3(0.5f, npcHeight / 2f, 0.5f);

        Color bodyColor = GetRoleColor(data.role);
        body.GetComponent<Renderer>().material.color = bodyColor;

        // ─── Head (sphere) ────────────────────────────────
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "Head";
        head.transform.SetParent(npc.transform, false);
        head.transform.localPosition = new Vector3(0, npcHeight + 0.15f, 0);
        head.transform.localScale = new Vector3(0.35f, 0.35f, 0.35f);
        head.GetComponent<Renderer>().material.color = new Color(0.85f, 0.7f, 0.55f); // Skin

        // ─── Name Label (world-space canvas) ──────────────
        CreateNameLabel(npc.transform, data.name, data.role);

        // ─── Interaction Trigger ──────────────────────────
        var trigger = npc.AddComponent<SphereCollider>();
        trigger.isTrigger = true;
        trigger.center = new Vector3(0, npcHeight / 2f, 0);
        trigger.radius = interactionRadius;

        // ─── NPCController (idle behavior) ────────────────
        var controller = npc.AddComponent<NPCController>();
        controller.npcName = data.name;
        controller.role = data.role;
        controller.language = data.language;
        controller.personality = data.personality;
        controller.culturalNote = data.culturalNote;
        controller.portName = port.name;
        controller.portCountry = port.country;

        // ─── NPCInteraction (already-existing script) ─────
        var interaction = npc.AddComponent<NPCInteraction>();
        // NPCInteraction handles E-to-talk and dialogue via AAPMBridge

        return npc;
    }

    void CreateNameLabel(Transform parent, string name, string role)
    {
        var canvasGO = new GameObject("NameLabel");
        canvasGO.transform.SetParent(parent, false);
        canvasGO.transform.localPosition = new Vector3(0, labelHeight, 0);

        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.WorldSpace;

        var scaler = canvasGO.AddComponent<CanvasScaler>();
        var rect = canvasGO.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(2f, 0.5f);
        rect.localScale = new Vector3(0.01f, 0.01f, 0.01f);

        // Background
        var bg = canvasGO.AddComponent<Image>();
        bg.color = new Color(0, 0, 0, 0.5f);

        // Name text
        var textGO = new GameObject("Text");
        textGO.transform.SetParent(canvasGO.transform, false);
        var text = textGO.AddComponent<Text>();
        text.text = $"{name}\n<size=8>{role}</size>";
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = 12;
        text.color = Color.white;
        text.alignment = TextAnchor.MiddleCenter;

        var textRect = textGO.GetComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = Vector2.zero;
        textRect.offsetMax = Vector2.zero;

        // Billboard behavior (face camera) handled by NPCController
    }

    void SpawnCrewSpecials(PortData port, List<Transform> spawnPoints)
    {
        // Check if any crew member has a special at this port
        if (!string.IsNullOrEmpty(port.crewSpecialCrew))
        {
            Debug.Log($"[NPCSpawner] 🌟 Crew special: {port.crewSpecialCrew} — {port.crewSpecialNote}");
            // In a full implementation, this would trigger crew reunion/special event
        }
    }

    Color GetRoleColor(string role)
    {
        if (string.IsNullOrEmpty(role)) return Color.grey;

        // Check exact match
        if (_roleColors.TryGetValue(role, out var color)) return color;

        // Check partial match
        foreach (var kvp in _roleColors)
        {
            if (role.Contains(kvp.Key) || kvp.Key.Contains(role))
                return kvp.Value;
        }

        // Random deterministic color based on role hash
        int hash = role.GetHashCode();
        return new Color(
            (hash & 0xFF) / 255f * 0.5f + 0.25f,
            ((hash >> 8) & 0xFF) / 255f * 0.5f + 0.25f,
            ((hash >> 16) & 0xFF) / 255f * 0.5f + 0.25f
        );
    }
}
