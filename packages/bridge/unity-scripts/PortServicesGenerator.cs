/*
 * PortServicesGenerator.cs — Adds universal service buildings to every port.
 *
 * Every port gets the same core services regardless of whether it has
 * landmark-specific data. Services are placed around the marina in a
 * consistent layout so players always know where to find essentials.
 *
 * Service Ring Layout (around port center):
 *
 *                 [Tourist Info]
 *            [Immigration]  [Police]
 *       [Bank]                    [Hospital]
 *  [Chandlery]    < MARINA >     [Pharmacy]
 *       [Grocery]                 [Restaurant]
 *            [Boardwalk]     [Taxi Stand]
 *
 * Each building has:
 *   - Culturally appropriate architecture and colors
 *   - A named NPC from port-services.yaml based on country
 *   - An icon sign (emoji rendered as world-space text)
 *   - Interaction trigger for language-learning scenarios
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.UI;

[Serializable]
public class ServiceNPCData
{
    public string name;
    public string language;
    public string personality;
}

[Serializable]
public class ServiceDefinition
{
    public string id;              // "immigration", "police", etc.
    public string buildingType;    // "official", "medical", "commercial", etc.
    public string icon;
    public string npcRole;
    public List<string> dialogueScenarios = new List<string>();
    public Dictionary<string, ServiceNPCData> npcByCountry = new Dictionary<string, ServiceNPCData>();
}

/// <summary>
/// Generates universal service buildings at every port.
/// Call GenerateServices() after the main port is generated.
/// Returns additional NPC spawn points for NPCSpawner.
/// </summary>
public class PortServicesGenerator : MonoBehaviour
{
    public static PortServicesGenerator Instance { get; private set; }

    // ─── Service Placement ────────────────────────────────────
    // Positions relative to port center, arranged in a ring
    private static readonly (string id, float x, float z, float facing)[] ServiceLayout = {
        ("immigration",  -40, 25, 180),
        ("police",        40, 25, 180),
        ("hospital",      60, 10, 270),
        ("pharmacy",      60, -10, 270),
        ("grocery",      -50, -15, 90),
        ("restaurant",    50, -20, 270),
        ("boardwalk",      0, -35, 0),
        ("bank",         -55, 10, 90),
        ("chandlery",    -55, 0, 90),
        ("tourist_info",   0, 35, 180),
        ("taxi",          45, -30, 270),
    };

    // ─── Building Dimensions by Type ──────────────────────────
    private static readonly Dictionary<string, Vector3> BuildingSizes = new Dictionary<string, Vector3>
    {
        {"official",    new Vector3(10f, 4f, 8f)},
        {"medical",     new Vector3(12f, 5f, 10f)},
        {"commercial",  new Vector3(8f, 3.5f, 6f)},
        {"hospitality", new Vector3(12f, 4f, 8f)},
        {"outdoor",     new Vector3(40f, 0.1f, 5f)},  // Boardwalk is flat
        {"maritime",    new Vector3(10f, 4f, 8f)},
        {"transport",   new Vector3(5f, 3f, 3f)},
    };

    private readonly List<ServiceDefinition> _services = new List<ServiceDefinition>();
    private GameObject _servicesRoot;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        LoadServiceData();
        if (_services.Count == 0) LoadBuiltInServices();
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Generate all universal service buildings at a port.
    /// Returns NPC spawn points for NPCSpawner.
    /// </summary>
    public List<Transform> GenerateServices(string country, Vector3 portCenter)
    {
        if (_servicesRoot != null) Destroy(_servicesRoot);

        _servicesRoot = new GameObject("PortServices");
        _servicesRoot.transform.position = portCenter;

        var spawnPoints = new List<Transform>();
        var palette = GetCountryPalette(country);

        foreach (var placement in ServiceLayout)
        {
            var service = _services.Find(s => s.id == placement.id);
            if (service == null) continue;

            Vector3 buildingPos = portCenter + new Vector3(placement.x, 0, placement.z);
            float facing = placement.facing;

            var buildingGO = GenerateServiceBuilding(service, buildingPos, facing, palette, country);

            // Get country-specific NPC
            ServiceNPCData npcData = GetNPCForCountry(service, country);
            if (npcData != null)
            {
                var spawnPt = CreateNPCSpawn(buildingGO, npcData.name, service.npcRole,
                    buildingPos + Quaternion.Euler(0, facing, 0) * Vector3.forward * 5f);
                spawnPoints.Add(spawnPt);
            }
        }

        // Generate boardwalk connecting all waterfront services
        GenerateBoardwalkConnector(portCenter, palette);

        Debug.Log($"[Services] 🏢 Generated {ServiceLayout.Length} service buildings for {country}, {spawnPoints.Count} service NPCs");
        return spawnPoints;
    }

    public void ClearServices()
    {
        if (_servicesRoot != null) Destroy(_servicesRoot);
    }

    // ─── Building Generation ──────────────────────────────────

    GameObject GenerateServiceBuilding(ServiceDefinition service, Vector3 pos, float facing, Color[] palette, string country)
    {
        var go = new GameObject($"Service_{service.id}");
        go.transform.SetParent(_servicesRoot.transform, false);
        go.transform.position = pos;
        go.transform.rotation = Quaternion.Euler(0, facing, 0);

        Vector3 size = BuildingSizes.ContainsKey(service.buildingType)
            ? BuildingSizes[service.buildingType]
            : new Vector3(8f, 4f, 6f);

        switch (service.buildingType)
        {
            case "official":
                BuildOfficialBuilding(go, size, palette, service); break;
            case "medical":
                BuildMedicalBuilding(go, size, palette); break;
            case "commercial":
                BuildCommercialBuilding(go, size, palette, service); break;
            case "hospitality":
                BuildHospitalityBuilding(go, size, palette, country); break;
            case "outdoor":
                BuildBoardwalk(go, size, palette); break;
            case "maritime":
                BuildMaritimeBuilding(go, size, palette); break;
            case "transport":
                BuildTransportStand(go, size, palette); break;
            default:
                BuildGenericService(go, size, palette); break;
        }

        // Sign with icon and name
        CreateServiceSign(go, service.icon, service.id, pos + Vector3.up * (size.y + 0.5f));

        return go;
    }

    void BuildOfficialBuilding(GameObject p, Vector3 s, Color[] pal, ServiceDefinition svc)
    {
        // Main building
        Box(p, "Building", V3(0, s.y/2, 0), s, pal[0]);
        Box(p, "Roof", V3(0, s.y+0.15f, 0), V3(s.x+0.5f, 0.3f, s.z+0.5f), pal[1]);

        // Flag pole
        Cyl(p, "FlagPole", V3(s.x/2+1, 3, 0), V3(0.08f, 3, 0.08f), Color.white);
        Box(p, "Flag", V3(s.x/2+1.5f, 5.5f, 0), V3(1.2f, 0.8f, 0.02f), pal[2]);

        // Door
        Box(p, "Door", V3(0, 1.1f, -s.z/2-0.01f), V3(1.5f, 2.2f, 0.05f), C(0.3f,0.2f,0.1f));

        // Windows
        float windowY = s.y * 0.6f;
        Box(p, "WinL", V3(-s.x/4, windowY, -s.z/2-0.01f), V3(1f, 1.2f, 0.03f), C(0.5f,0.65f,0.8f));
        Box(p, "WinR", V3(s.x/4, windowY, -s.z/2-0.01f), V3(1f, 1.2f, 0.03f), C(0.5f,0.65f,0.8f));

        // Official emblem (colored circle on facade)
        Sph(p, "Emblem", V3(0, s.y*0.8f, -s.z/2-0.02f), V3(0.6f, 0.6f, 0.1f), pal[2]);

        // Bollards at entrance (security)
        if (svc.id == "immigration" || svc.id == "police")
        {
            for (int i = 0; i < 3; i++)
            {
                Cyl(p, $"Bollard_{i}", V3(-1.5f+i*1.5f, 0.35f, -s.z/2-2f),
                    V3(0.2f, 0.35f, 0.2f), C(0.3f, 0.3f, 0.3f));
            }
        }
    }

    void BuildMedicalBuilding(GameObject p, Vector3 s, Color[] pal)
    {
        Box(p, "Building", V3(0, s.y/2, 0), s, Color.white);
        Box(p, "Roof", V3(0, s.y+0.15f, 0), V3(s.x+0.5f, 0.3f, s.z+0.5f), C(0.85f,0.85f,0.85f));

        // Red cross
        Box(p, "CrossV", V3(0, s.y*0.7f, -s.z/2-0.02f), V3(0.3f, 1.2f, 0.05f), C(0.85f,0.15f,0.1f));
        Box(p, "CrossH", V3(0, s.y*0.7f, -s.z/2-0.02f), V3(1.2f, 0.3f, 0.05f), C(0.85f,0.15f,0.1f));

        // Double doors
        Box(p, "DoorL", V3(-0.6f, 1.1f, -s.z/2-0.01f), V3(1f, 2.2f, 0.05f), C(0.8f,0.8f,0.82f));
        Box(p, "DoorR", V3(0.6f, 1.1f, -s.z/2-0.01f), V3(1f, 2.2f, 0.05f), C(0.8f,0.8f,0.82f));

        // Emergency light
        Sph(p, "EmLight", V3(0, s.y+0.6f, 0), V3(0.3f, 0.3f, 0.3f), C(0.9f,0.2f,0.1f));

        // Ambulance parking stripe
        Box(p, "ParkStripe", V3(-s.x/2-2f, 0.01f, 0), V3(3f, 0.02f, 5f), C(0.9f,0.9f,0.1f));
    }

    void BuildCommercialBuilding(GameObject p, Vector3 s, Color[] pal, ServiceDefinition svc)
    {
        Box(p, "Building", V3(0, s.y/2, 0), s, pal[0]);
        Box(p, "Roof", V3(0, s.y+0.1f, 0), V3(s.x+0.3f, 0.2f, s.z+0.3f), pal[1]);

        // Awning over entrance
        Color awningColor = svc.id == "pharmacy" ? C(0.1f,0.6f,0.2f) : // Green cross
                           svc.id == "grocery" ? C(0.2f,0.45f,0.15f) :
                           svc.id == "bank" ? C(0.15f,0.25f,0.45f) :
                           pal[2];
        Box(p, "Awning", V3(0, s.y*0.6f, -s.z/2-0.8f), V3(s.x*0.8f, 0.08f, 1.5f), awningColor);

        // Shop window
        Box(p, "Window", V3(0, s.y*0.4f, -s.z/2-0.01f), V3(s.x*0.6f, s.y*0.4f, 0.03f), C(0.6f,0.75f,0.85f));

        // Door
        Box(p, "Door", V3(s.x/4, 1.1f, -s.z/2-0.01f), V3(1.2f, 2.2f, 0.05f), C(0.3f,0.25f,0.15f));

        // Pharmacy green cross
        if (svc.id == "pharmacy")
        {
            Box(p, "PhCrossV", V3(-s.x/4, s.y*0.7f, -s.z/2-0.05f), V3(0.15f, 0.6f, 0.05f), C(0.1f,0.7f,0.2f));
            Box(p, "PhCrossH", V3(-s.x/4, s.y*0.7f, -s.z/2-0.05f), V3(0.6f, 0.15f, 0.05f), C(0.1f,0.7f,0.2f));
        }

        // Produce display (grocery)
        if (svc.id == "grocery")
        {
            Color[] fruits = {C(0.9f,0.8f,0.1f), C(0.9f,0.3f,0.1f), C(0.3f,0.7f,0.2f), C(0.8f,0.4f,0.1f)};
            for (int i = 0; i < 4; i++)
            {
                Box(p, $"Crate_{i}", V3(-1.5f+i*1.2f, 0.4f, -s.z/2-1.5f),
                    V3(0.8f, 0.5f, 0.6f), C(0.5f,0.35f,0.2f));
                Sph(p, $"Produce_{i}", V3(-1.5f+i*1.2f, 0.75f, -s.z/2-1.5f),
                    V3(0.5f, 0.3f, 0.4f), fruits[i]);
            }
        }
    }

    void BuildHospitalityBuilding(GameObject p, Vector3 s, Color[] pal, string country)
    {
        Box(p, "Building", V3(0, s.y/2, 0), s, pal[0]);
        Box(p, "Roof", V3(0, s.y+0.15f, 0), V3(s.x+0.5f, 0.3f, s.z+0.5f), pal[1]);

        // Terrace with tables
        Box(p, "Terrace", V3(0, 0.05f, -s.z/2-3f), V3(s.x+2, 0.1f, 5f), C(0.6f,0.55f,0.45f));
        for (int i = 0; i < 4; i++)
        {
            float tx = -s.x/3 + i * s.x/4.5f;
            Box(p, $"Table_{i}", V3(tx, 0.45f, -s.z/2-3f), V3(0.8f, 0.05f, 0.8f), Color.white);
            // Chairs
            Box(p, $"Chair_{i}_a", V3(tx-0.5f, 0.25f, -s.z/2-3.5f), V3(0.3f, 0.5f, 0.3f), pal[2]);
            Box(p, $"Chair_{i}_b", V3(tx+0.5f, 0.25f, -s.z/2-3.5f), V3(0.3f, 0.5f, 0.3f), pal[2]);
        }

        // Door
        Box(p, "Door", V3(0, 1.1f, -s.z/2-0.01f), V3(1.5f, 2.2f, 0.05f), C(0.35f,0.25f,0.15f));

        // Menu board
        Box(p, "MenuBoard", V3(-s.x/2+0.5f, 0.8f, -s.z/2-1f), V3(0.6f, 0.9f, 0.05f), C(0.15f,0.15f,0.1f));

        // Flower pots
        for (int i = 0; i < 3; i++)
        {
            Cyl(p, $"Pot_{i}", V3(-1+i, 0.2f, -s.z/2-0.5f), V3(0.25f, 0.2f, 0.25f), C(0.6f,0.35f,0.2f));
            Sph(p, $"Flower_{i}", V3(-1+i, 0.5f, -s.z/2-0.5f), V3(0.35f, 0.25f, 0.35f),
                i==1 ? C(0.8f,0.2f,0.3f) : C(0.9f,0.5f,0.7f));
        }
    }

    void BuildBoardwalk(GameObject p, Vector3 s, Color[] pal)
    {
        // Long promenade
        Box(p, "Planks", V3(0, 0.08f, 0), V3(s.x, 0.15f, s.z), C(0.55f,0.42f,0.25f));

        // Railing (sea side)
        for (int i = 0; i < (int)(s.x/3); i++)
        {
            Cyl(p, $"Post_{i}", V3(-s.x/2+1.5f+i*3, 0.5f, -s.z/2), V3(0.04f, 0.5f, 0.04f), C(0.3f,0.3f,0.3f));
        }
        Box(p, "TopRail", V3(0, 1f, -s.z/2), V3(s.x, 0.04f, 0.04f), C(0.3f,0.3f,0.3f));

        // Benches
        for (int i = 0; i < (int)(s.x/12); i++)
        {
            Box(p, $"Bench_{i}", V3(-s.x/3+i*12, 0.3f, s.z/3), V3(1.5f, 0.4f, 0.5f), C(0.45f,0.35f,0.2f));
        }

        // Light posts
        for (int i = 0; i < (int)(s.x/15)+1; i++)
        {
            float lx = -s.x/2+7+i*15;
            Cyl(p, $"LightPost_{i}", V3(lx, 2f, 0), V3(0.06f, 2f, 0.06f), C(0.2f,0.2f,0.2f));
            Sph(p, $"LightGlobe_{i}", V3(lx, 4.2f, 0), V3(0.4f, 0.4f, 0.4f), C(1f,0.95f,0.7f));
        }
    }

    void BuildMaritimeBuilding(GameObject p, Vector3 s, Color[] pal)
    {
        Box(p, "Building", V3(0, s.y/2, 0), s, pal[0]);
        Box(p, "Roof", V3(0, s.y+0.1f, 0), V3(s.x+0.3f, 0.2f, s.z+0.3f), pal[1]);

        // Anchor decoration
        Cyl(p, "AnchorRing", V3(0, s.y*0.7f, -s.z/2-0.05f), V3(0.5f, 0.05f, 0.5f), C(0.3f,0.3f,0.3f));
        Box(p, "AnchorShank", V3(0, s.y*0.5f, -s.z/2-0.05f), V3(0.1f, 0.8f, 0.05f), C(0.3f,0.3f,0.3f));

        // Rope coils outside
        for (int i = 0; i < 3; i++)
        {
            Cyl(p, $"Rope_{i}", V3(-2+i*2, 0.15f, -s.z/2-1.5f), V3(0.4f, 0.15f, 0.4f), C(0.6f,0.5f,0.3f));
        }

        // Door
        Box(p, "Door", V3(0, 1.1f, -s.z/2-0.01f), V3(1.4f, 2.2f, 0.05f), C(0.2f,0.3f,0.45f));
    }

    void BuildTransportStand(GameObject p, Vector3 s, Color[] pal)
    {
        // Taxi shelter
        Box(p, "Shelter", V3(0, s.y/2, 0), V3(s.x, 0.1f, s.z), pal[2]);
        // Poles
        Cyl(p, "PoleA", V3(-s.x/2+0.3f, s.y/2, -s.z/2+0.3f), V3(0.05f, s.y/2, 0.05f), C(0.3f,0.3f,0.3f));
        Cyl(p, "PoleB", V3(-s.x/2+0.3f, s.y/2, s.z/2-0.3f), V3(0.05f, s.y/2, 0.05f), C(0.3f,0.3f,0.3f));
        Cyl(p, "PoleC", V3(s.x/2-0.3f, s.y/2, -s.z/2+0.3f), V3(0.05f, s.y/2, 0.05f), C(0.3f,0.3f,0.3f));
        Cyl(p, "PoleD", V3(s.x/2-0.3f, s.y/2, s.z/2-0.3f), V3(0.05f, s.y/2, 0.05f), C(0.3f,0.3f,0.3f));

        // Taxi sign
        Box(p, "TaxiSign", V3(0, s.y+0.3f, 0), V3(1.2f, 0.4f, 0.1f), C(0.9f,0.8f,0.1f));

        // Bench
        Box(p, "Bench", V3(0, 0.25f, s.z/4), V3(s.x*0.6f, 0.3f, 0.4f), C(0.4f,0.35f,0.25f));
    }

    void BuildGenericService(GameObject p, Vector3 s, Color[] pal)
    {
        Box(p, "Building", V3(0, s.y/2, 0), s, pal[0]);
        Box(p, "Roof", V3(0, s.y+0.1f, 0), V3(s.x+0.3f, 0.2f, s.z+0.3f), pal[1]);
        Box(p, "Door", V3(0, 1.1f, -s.z/2-0.01f), V3(1.2f, 2.2f, 0.05f), C(0.3f,0.25f,0.15f));
    }

    // ─── Sign & NPC Helpers ───────────────────────────────────

    void CreateServiceSign(GameObject parent, string icon, string serviceId, Vector3 position)
    {
        var signGO = new GameObject($"Sign_{serviceId}");
        signGO.transform.SetParent(parent.transform, false);
        signGO.transform.position = position;

        // Background
        var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
        board.name = "Board";
        board.transform.SetParent(signGO.transform, false);
        board.transform.localScale = new Vector3(2f, 0.6f, 0.08f);
        board.GetComponent<Renderer>().material.color = new Color(0.15f, 0.2f, 0.35f);

        // Text
        var canvasGO = new GameObject("SignText");
        canvasGO.transform.SetParent(signGO.transform, false);
        canvasGO.transform.localPosition = Vector3.forward * -0.05f;
        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.WorldSpace;
        var rect = canvasGO.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(2f, 0.6f);
        rect.localScale = V3(0.01f, 0.01f, 0.01f);

        var textGO = new GameObject("Text");
        textGO.transform.SetParent(canvasGO.transform, false);
        var text = textGO.AddComponent<Text>();
        text.text = $"{icon} {FormatServiceName(serviceId)}";
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = 14;
        text.color = Color.white;
        text.alignment = TextAnchor.MiddleCenter;
        var textRect = textGO.GetComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = textRect.offsetMax = Vector2.zero;
    }

    Transform CreateNPCSpawn(GameObject building, string npcName, string role, Vector3 worldPos)
    {
        var go = new GameObject($"ServiceNPC_{npcName}_{role}");
        go.transform.SetParent(building.transform, false);
        go.transform.position = worldPos;
        return go.transform;
    }

    void GenerateBoardwalkConnector(Vector3 portCenter, Color[] palette)
    {
        // Connect waterfront services with a paved path
        Box(_servicesRoot, "WaterfrontPath",
            V3(portCenter.x, 0.03f, portCenter.z - 25f),
            V3(120f, 0.06f, 3f), C(0.6f, 0.55f, 0.45f));
    }

    // ─── NPC Data Resolution ──────────────────────────────────

    ServiceNPCData GetNPCForCountry(ServiceDefinition service, string country)
    {
        // Exact match
        if (service.npcByCountry.TryGetValue(country, out var npc)) return npc;

        // Partial match (e.g., "Italy (Sicily)" → "Italy")
        foreach (var kvp in service.npcByCountry)
        {
            if (country.Contains(kvp.Key) || kvp.Key.Contains(country)) return kvp.Value;
        }

        // Fallback: generate a generic NPC
        return new ServiceNPCData
        {
            name = $"{service.npcRole}",
            language = "English",
            personality = $"Helpful {service.npcRole} at the local port"
        };
    }

    // ─── Data Loading ─────────────────────────────────────────

    void LoadServiceData()
    {
        string path = Path.Combine(Application.streamingAssetsPath, "ports-registry", "port-services.yaml");
        if (!File.Exists(path))
        {
            Debug.Log("[Services] No service data file — using built-in defaults");
            return;
        }

        string yaml = File.ReadAllText(path);
        ParseServiceYAML(yaml);
        Debug.Log($"[Services] ✅ Loaded {_services.Count} service definitions");
    }

    void ParseServiceYAML(string yaml)
    {
        ServiceDefinition current = null;
        string currentCountry = null;

        foreach (string rawLine in yaml.Split('\n'))
        {
            string line = rawLine.TrimEnd('\r');
            string trimmed = line.TrimStart();

            // Service ID (e.g., "  immigration:")
            if (line.StartsWith("  ") && !line.StartsWith("    ") && trimmed.EndsWith(":") && !trimmed.StartsWith("-") && !trimmed.StartsWith("#"))
            {
                string id = trimmed.TrimEnd(':');
                if (id != "services" && id != "names_by_country" && id != "dialogue_scenarios")
                {
                    current = new ServiceDefinition { id = id };
                    _services.Add(current);
                    continue;
                }
            }

            if (current == null) continue;

            if (trimmed.StartsWith("building_type:"))
                current.buildingType = trimmed.Substring("building_type:".Length).Trim();
            else if (trimmed.StartsWith("icon:"))
                current.icon = trimmed.Substring("icon:".Length).Trim().Trim('"');
            else if (trimmed.StartsWith("npc_role:"))
                current.npcRole = trimmed.Substring("npc_role:".Length).Trim();
            else if (trimmed.StartsWith("- ") && trimmed.Length > 2 && !trimmed.Contains("{"))
            {
                current.dialogueScenarios.Add(trimmed.Substring(2).Trim());
            }

            // Country NPC entries
            var countryMatch = Regex.Match(line, @"^\s{6}(\w[\w\s()]*?):\s*\{");
            if (countryMatch.Success)
            {
                currentCountry = countryMatch.Groups[1].Value.Trim();
                var npcMatch = Regex.Match(line, @"name:\s*""([^""]+)""");
                var langMatch = Regex.Match(line, @"lang:\s*(\w[^,}]+)");
                var persMatch = Regex.Match(line, @"personality:\s*""([^""]+)""");

                if (npcMatch.Success)
                {
                    current.npcByCountry[currentCountry] = new ServiceNPCData
                    {
                        name = npcMatch.Groups[1].Value,
                        language = langMatch.Success ? langMatch.Groups[1].Value.Trim() : "English",
                        personality = persMatch.Success ? persMatch.Groups[1].Value : ""
                    };
                }
            }
        }
    }

    void LoadBuiltInServices()
    {
        _services.AddRange(new[]
        {
            MakeService("immigration", "official", "🛂", "immigration-officer"),
            MakeService("police", "official", "👮", "port-police"),
            MakeService("hospital", "medical", "🏥", "doctor"),
            MakeService("pharmacy", "commercial", "💊", "pharmacist"),
            MakeService("grocery", "commercial", "🛒", "grocer"),
            MakeService("restaurant", "hospitality", "🍽️", "restaurant-owner"),
            MakeService("boardwalk", "outdoor", "🌊", "promenade-vendor"),
            MakeService("bank", "commercial", "🏦", "bank-teller"),
            MakeService("chandlery", "maritime", "⚓", "chandler"),
            MakeService("tourist_info", "official", "ℹ️", "tourist-guide"),
            MakeService("taxi", "transport", "🚕", "taxi-driver"),
        });
        Debug.Log($"[Services] Loaded {_services.Count} built-in service types");
    }

    ServiceDefinition MakeService(string id, string type, string icon, string role)
    {
        return new ServiceDefinition { id = id, buildingType = type, icon = icon, npcRole = role };
    }

    // ─── Style Helpers ────────────────────────────────────────

    string FormatServiceName(string id) =>
        id.Replace("_", " ").Substring(0, 1).ToUpper() + id.Replace("_", " ").Substring(1);

    Color[] GetCountryPalette(string country)
    {
        // Match known palettes
        var palettes = new Dictionary<string, Color[]>
        {
            {"Spain", new[]{C(0.92f,0.89f,0.82f), C(0.65f,0.3f,0.18f), C(0.2f,0.35f,0.6f), C(0.7f,0.62f,0.48f)}},
            {"France", new[]{C(0.82f,0.78f,0.72f), C(0.3f,0.3f,0.35f), C(0.2f,0.35f,0.55f), C(0.62f,0.58f,0.52f)}},
            {"Italy", new[]{C(0.88f,0.72f,0.48f), C(0.65f,0.32f,0.18f), C(0.45f,0.18f,0.12f), C(0.58f,0.52f,0.42f)}},
            {"Greece", new[]{C(0.92f,0.92f,0.95f), C(0.2f,0.4f,0.7f), C(0.15f,0.35f,0.65f), C(0.78f,0.75f,0.68f)}},
            {"Turkey", new[]{C(0.78f,0.72f,0.62f), C(0.48f,0.48f,0.42f), C(0.1f,0.35f,0.45f), C(0.58f,0.52f,0.42f)}},
            {"Croatia", new[]{C(0.78f,0.75f,0.68f), C(0.68f,0.3f,0.15f), C(0.5f,0.22f,0.12f), C(0.62f,0.58f,0.52f)}},
            {"Morocco", new[]{C(0.8f,0.58f,0.35f), C(0.72f,0.52f,0.3f), C(0.15f,0.4f,0.25f), C(0.68f,0.58f,0.42f)}},
            {"Malta", new[]{C(0.8f,0.72f,0.55f), C(0.72f,0.65f,0.5f), C(0.2f,0.4f,0.3f), C(0.68f,0.62f,0.48f)}},
            {"Egypt", new[]{C(0.82f,0.72f,0.52f), C(0.72f,0.58f,0.38f), C(0.15f,0.35f,0.25f), C(0.72f,0.62f,0.48f)}},
        };

        if (palettes.TryGetValue(country, out var p)) return p;
        foreach (var kvp in palettes)
            if (country.Contains(kvp.Key)) return kvp.Value;
        return new[]{C(0.78f,0.75f,0.7f), C(0.58f,0.32f,0.22f), C(0.38f,0.28f,0.22f), C(0.62f,0.58f,0.48f)};
    }

    // ─── Shorthand ────────────────────────────────────────────

    static Color C(float r, float g, float b) => new Color(r, g, b);
    static Vector3 V3(float x, float y, float z) => new Vector3(x, y, z);

    GameObject Box(GameObject p, string n, Vector3 pos, Vector3 s, Color c)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = n; go.transform.SetParent(p.transform, false);
        go.transform.localPosition = pos; go.transform.localScale = s;
        go.GetComponent<Renderer>().material.color = c; go.isStatic = true; return go;
    }
    GameObject Cyl(GameObject p, string n, Vector3 pos, Vector3 s, Color c)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = n; go.transform.SetParent(p.transform, false);
        go.transform.localPosition = pos; go.transform.localScale = s;
        go.GetComponent<Renderer>().material.color = c; go.isStatic = true; return go;
    }
    GameObject Sph(GameObject p, string n, Vector3 pos, Vector3 s, Color c)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = n; go.transform.SetParent(p.transform, false);
        go.transform.localPosition = pos; go.transform.localScale = s;
        go.GetComponent<Renderer>().material.color = c; go.isStatic = true; return go;
    }
}
