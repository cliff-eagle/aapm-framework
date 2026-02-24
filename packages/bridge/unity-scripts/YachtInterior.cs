/*
 * YachtInterior.cs — Below-deck rooms and on-deck areas.
 *
 * SETUP:
 *   1. Attach to the Yacht GameObject (as child of YachtController)
 *   2. Creates interior spaces the player can walk through:
 *      - Bridge / wheelhouse (navigation instruments)
 *      - Galley (kitchen — Chef Yasmine's domain)
 *      - Salon (main living area)
 *      - Crew quarters (4 bunks)
 *      - Captain's cabin
 *      - Engine room
 *   3. Aft deck, bow deck, flybridge accessible for walking
 *
 * Transition: Player enters/exits through companionway hatch
 * on the main deck. Interior uses a separate camera + lighting.
 */

using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Creates walkable interior spaces within the yacht.
/// Player transitions between deck and interior via companionway.
/// </summary>
public class YachtInterior : MonoBehaviour
{
    [Header("Dimensions (meters)")]
    public float deckHeight = 2.5f;
    public float wallThickness = 0.15f;
    public float floorThickness = 0.2f;

    [Header("Interior Lighting")]
    public Color ambientWarm = new Color(1f, 0.92f, 0.75f);
    public float interiorBrightness = 0.8f;

    // ─── State ────────────────────────────────────────────────

    public static YachtInterior Instance { get; private set; }
    public bool IsPlayerBelowDeck { get; private set; }

    private GameObject _interiorRoot;
    private readonly List<Transform> _crewPositions = new List<Transform>();
    private Transform _companionwayEntry;
    private Transform _companionwayExit;
    private Light _interiorLight;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        BuildInterior();
    }

    void Update()
    {
        // Check for below-deck transition
        if (Input.GetKeyDown(KeyCode.B))
        {
            ToggleBelowDeck();
        }
    }

    // ─── Public API ───────────────────────────────────────────

    public void ToggleBelowDeck()
    {
        IsPlayerBelowDeck = !IsPlayerBelowDeck;

        if (_interiorRoot != null)
            _interiorRoot.SetActive(IsPlayerBelowDeck);

        var player = FindObjectOfType<PlayerController>();
        if (player != null)
        {
            if (IsPlayerBelowDeck)
            {
                player.transform.position = _companionwayExit != null
                    ? _companionwayExit.position
                    : transform.position + Vector3.down * 2f;
            }
            else
            {
                player.transform.position = _companionwayEntry != null
                    ? _companionwayEntry.position
                    : transform.position + Vector3.up * 2f;
            }
        }

        Debug.Log($"[Yacht] {(IsPlayerBelowDeck ? "⬇️ Going below deck" : "⬆️ Coming topside")}");
    }

    /// <summary>Get crew member positions for cutscenes/interactions</summary>
    public List<Transform> GetCrewPositions() => _crewPositions;

    // ─── Interior Construction ────────────────────────────────

    void BuildInterior()
    {
        _interiorRoot = new GameObject("Interior");
        _interiorRoot.transform.SetParent(transform, false);
        _interiorRoot.transform.localPosition = new Vector3(0, -1.5f, 0); // Below deck level

        // Interior ambient light
        var lightGO = new GameObject("InteriorLight");
        lightGO.transform.SetParent(_interiorRoot.transform, false);
        lightGO.transform.localPosition = new Vector3(0, deckHeight - 0.2f, 0);
        _interiorLight = lightGO.AddComponent<Light>();
        _interiorLight.type = LightType.Point;
        _interiorLight.color = ambientWarm;
        _interiorLight.intensity = interiorBrightness;
        _interiorLight.range = 20f;

        // ─── Build Rooms ──────────────────────────────────

        BuildBridge(new Vector3(0, 0, 12f));        // Forward, upper
        BuildSalon(new Vector3(0, 0, 4f));          // Center
        BuildGalley(new Vector3(0, 0, -2f));        // Center-aft
        BuildCrewQuarters(new Vector3(0, 0, -8f));  // Aft
        BuildCaptainCabin(new Vector3(-2.5f, 0, 8f)); // Port side, forward
        BuildEngineRoom(new Vector3(0, -1f, -12f)); // Below, stern

        // Companionway (stairs)
        _companionwayEntry = CreatePoint(_interiorRoot, "CompanionwayEntry", new Vector3(0, 3f, 0));
        _companionwayExit = CreatePoint(_interiorRoot, "CompanionwayExit", new Vector3(0, 0.5f, 0));

        // Floor (continuous)
        CreatePanel(_interiorRoot, "Floor",
            new Vector3(0, 0, 0), new Vector3(7f, floorThickness, 28f),
            new Color(0.5f, 0.38f, 0.22f)); // Teak floor

        // Start hidden
        _interiorRoot.SetActive(false);
    }

    void BuildBridge(Vector3 center)
    {
        var room = CreateRoom("Bridge", center, new Vector3(5f, deckHeight, 4f));

        // Helm console
        CreatePanel(room, "HelmConsole",
            new Vector3(0, 0.6f, 1.5f), new Vector3(3f, 1.2f, 0.4f),
            new Color(0.15f, 0.15f, 0.2f)); // Dark console

        // Instrument panel (above console)
        CreatePanel(room, "Instruments",
            new Vector3(0, 1.5f, 1.8f), new Vector3(3.5f, 0.6f, 0.1f),
            new Color(0.1f, 0.1f, 0.15f));

        // Captain's chair
        CreatePanel(room, "CaptainChair",
            new Vector3(0, 0.35f, 0.5f), new Vector3(0.5f, 0.7f, 0.5f),
            new Color(0.3f, 0.25f, 0.2f));

        // Chart table
        CreatePanel(room, "ChartTable",
            new Vector3(-2f, 0.5f, 0), new Vector3(1.5f, 0.05f, 1f),
            new Color(0.6f, 0.5f, 0.3f));

        // VHF Radio
        CreatePanel(room, "VHFRadio",
            new Vector3(2f, 1.2f, 1.7f), new Vector3(0.3f, 0.2f, 0.15f),
            new Color(0.1f, 0.1f, 0.1f));

        _crewPositions.Add(CreatePoint(room, "CrewPos_Bridge", new Vector3(1.5f, 0, 0)));
    }

    void BuildSalon(Vector3 center)
    {
        var room = CreateRoom("Salon", center, new Vector3(6f, deckHeight, 5f));

        // Sofa (L-shaped)
        CreatePanel(room, "Sofa_Long",
            new Vector3(-2.5f, 0.3f, 0), new Vector3(0.8f, 0.6f, 3f),
            new Color(0.7f, 0.65f, 0.55f));
        CreatePanel(room, "Sofa_Short",
            new Vector3(-1.5f, 0.3f, -1.5f), new Vector3(2.5f, 0.6f, 0.8f),
            new Color(0.7f, 0.65f, 0.55f));

        // Dining table
        CreatePanel(room, "DiningTable",
            new Vector3(0, 0.45f, 0), new Vector3(2f, 0.05f, 1.2f),
            new Color(0.55f, 0.42f, 0.25f)); // Mahogany

        // TV screen
        CreatePanel(room, "TVScreen",
            new Vector3(2.7f, 1.2f, 0), new Vector3(0.05f, 0.8f, 1.4f),
            new Color(0.05f, 0.05f, 0.08f));

        _crewPositions.Add(CreatePoint(room, "CrewPos_Salon", new Vector3(-1f, 0, 0)));
    }

    void BuildGalley(Vector3 center)
    {
        var room = CreateRoom("Galley", center, new Vector3(5f, deckHeight, 3f));

        // Counter
        CreatePanel(room, "Counter",
            new Vector3(0, 0.55f, -1f), new Vector3(4f, 0.05f, 1f),
            new Color(0.8f, 0.78f, 0.72f)); // White marble

        // Stove
        CreatePanel(room, "Stove",
            new Vector3(-1f, 0.6f, -1f), new Vector3(0.6f, 0.1f, 0.6f),
            new Color(0.2f, 0.2f, 0.2f));

        // Sink
        CreatePanel(room, "Sink",
            new Vector3(1f, 0.5f, -1f), new Vector3(0.5f, 0.15f, 0.4f),
            new Color(0.7f, 0.7f, 0.72f)); // Stainless

        // Cabin (lower units)
        CreatePanel(room, "LowerCabinet",
            new Vector3(0, 0.25f, -1.2f), new Vector3(4f, 0.5f, 0.4f),
            new Color(0.55f, 0.42f, 0.25f));

        _crewPositions.Add(CreatePoint(room, "CrewPos_Galley", new Vector3(0, 0, 0.5f)));
    }

    void BuildCrewQuarters(Vector3 center)
    {
        var room = CreateRoom("CrewQuarters", center, new Vector3(6f, deckHeight, 4f));

        // 4 bunks (2 on each side, stacked)
        string[] crewNames = {"Luca", "Yasmine", "Emre", "Sofia"};
        for (int i = 0; i < 4; i++)
        {
            float x = (i < 2) ? -2f : 2f;
            float y = (i % 2 == 0) ? 0.3f : 1.2f;
            float z = (i < 2) ? 0 : 0;

            CreatePanel(room, $"Bunk_{crewNames[i]}",
                new Vector3(x, y, z), new Vector3(1.8f, 0.15f, 0.8f),
                new Color(0.5f, 0.38f, 0.22f));

            // Pillow
            CreatePanel(room, $"Pillow_{crewNames[i]}",
                new Vector3(x, y + 0.1f, z + 0.3f), new Vector3(0.3f, 0.08f, 0.2f),
                new Color(0.85f, 0.82f, 0.75f));

            // Personal shelf
            CreatePanel(room, $"Shelf_{crewNames[i]}",
                new Vector3(x, y + 0.6f, z - 0.35f), new Vector3(0.6f, 0.02f, 0.2f),
                new Color(0.5f, 0.4f, 0.25f));

            _crewPositions.Add(CreatePoint(room, $"CrewPos_{crewNames[i]}", new Vector3(x, 0, z)));
        }
    }

    void BuildCaptainCabin(Vector3 center)
    {
        var room = CreateRoom("CaptainCabin", center, new Vector3(4f, deckHeight, 3.5f));

        // Double bed
        CreatePanel(room, "Bed",
            new Vector3(0, 0.25f, 0), new Vector3(1.5f, 0.3f, 2f),
            new Color(0.8f, 0.75f, 0.65f));

        // Desk
        CreatePanel(room, "Desk",
            new Vector3(1.5f, 0.5f, -0.5f), new Vector3(0.8f, 0.04f, 0.5f),
            new Color(0.55f, 0.42f, 0.25f));

        // Porthole (bright blue circle — simulated)
        CreatePanel(room, "Porthole",
            new Vector3(-1.95f, 1.2f, 0), new Vector3(0.05f, 0.4f, 0.4f),
            new Color(0.3f, 0.6f, 0.85f));
    }

    void BuildEngineRoom(Vector3 center)
    {
        var room = CreateRoom("EngineRoom", center, new Vector3(5f, 1.5f, 4f));

        // Engine block
        CreatePanel(room, "EngineBlock",
            new Vector3(0, 0.4f, 0), new Vector3(2f, 0.8f, 2.5f),
            new Color(0.25f, 0.28f, 0.3f));

        // Pipes
        for (int i = 0; i < 3; i++)
        {
            var pipe = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pipe.name = $"Pipe_{i}";
            pipe.transform.SetParent(room.transform, false);
            pipe.transform.localPosition = new Vector3(-1.5f + i, 0.8f, -1.5f);
            pipe.transform.localScale = new Vector3(0.06f, 0.6f, 0.06f);
            pipe.GetComponent<Renderer>().material.color = new Color(0.5f, 0.5f, 0.45f);
        }

        // Warning sign (red panel)
        CreatePanel(room, "WarningSign",
            new Vector3(0, 1f, -1.95f), new Vector3(0.4f, 0.3f, 0.02f),
            new Color(0.8f, 0.15f, 0.1f));
    }

    // ─── Construction Helpers ─────────────────────────────────

    GameObject CreateRoom(string name, Vector3 center, Vector3 roomSize)
    {
        var room = new GameObject(name);
        room.transform.SetParent(_interiorRoot.transform, false);
        room.transform.localPosition = center;

        // Walls (4 sides)
        // Port wall
        CreatePanel(room, "Wall_Port",
            new Vector3(-roomSize.x / 2f, roomSize.y / 2f, 0),
            new Vector3(wallThickness, roomSize.y, roomSize.z),
            new Color(0.9f, 0.88f, 0.82f));
        // Starboard wall
        CreatePanel(room, "Wall_Starboard",
            new Vector3(roomSize.x / 2f, roomSize.y / 2f, 0),
            new Vector3(wallThickness, roomSize.y, roomSize.z),
            new Color(0.9f, 0.88f, 0.82f));
        // Forward bulkhead
        CreatePanel(room, "Wall_Forward",
            new Vector3(0, roomSize.y / 2f, roomSize.z / 2f),
            new Vector3(roomSize.x, roomSize.y, wallThickness),
            new Color(0.88f, 0.85f, 0.8f));
        // Aft bulkhead
        CreatePanel(room, "Wall_Aft",
            new Vector3(0, roomSize.y / 2f, -roomSize.z / 2f),
            new Vector3(roomSize.x, roomSize.y, wallThickness),
            new Color(0.88f, 0.85f, 0.8f));
        // Ceiling
        CreatePanel(room, "Ceiling",
            new Vector3(0, roomSize.y, 0),
            new Vector3(roomSize.x, floorThickness, roomSize.z),
            new Color(0.92f, 0.9f, 0.85f));

        // Room light
        var lightGO = new GameObject($"Light_{name}");
        lightGO.transform.SetParent(room.transform, false);
        lightGO.transform.localPosition = new Vector3(0, roomSize.y - 0.3f, 0);
        var light = lightGO.AddComponent<Light>();
        light.type = LightType.Point;
        light.color = ambientWarm;
        light.intensity = 0.6f;
        light.range = roomSize.x * 2f;

        return room;
    }

    GameObject CreatePanel(GameObject parent, string name, Vector3 localPos, Vector3 scale, Color color)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = name;
        go.transform.SetParent(parent.transform, false);
        go.transform.localPosition = localPos;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().material.color = color;
        go.isStatic = true;
        return go;
    }

    Transform CreatePoint(GameObject parent, string name, Vector3 localPos)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent.transform, false);
        go.transform.localPosition = localPos;
        return go.transform;
    }
}
