/*
 * RealisticPortGenerator.cs — Generates ports using real landmark data.
 *
 * REPLACES the generic PortEnvironmentGenerator with landmark-aware
 * generation that creates recognizable real-world places.
 *
 * SETUP:
 *   1. Attach to a persistent GameObject
 *   2. Place port-landmarks.yaml in StreamingAssets/ports-registry/
 *   3. When a landmark file exists for a port, uses it;
 *      otherwise falls back to PortEnvironmentGenerator generic layout
 *
 * Each landmark gets:
 *   - Appropriate geometry based on its type
 *   - A sign with its real name
 *   - NPC spawn point if an NPC is assigned there
 *   - Connecting paths/streets between landmarks
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.UI;

[Serializable]
public class LandmarkData
{
    public string name;
    public string type;       // marina, bazaar, ruins, etc.
    public float posX, posZ;  // relative to port center
    public float sizeX, sizeZ;
    public string note;       // cultural description
    public string npc;        // NPC name assigned here (if any)
}

[Serializable]
public class PortLayoutData
{
    public string portId;
    public string layoutStyle;
    public List<LandmarkData> landmarks = new List<LandmarkData>();
}

/// <summary>
/// Creates port environments based on real-world landmark data.
/// Each landmark type generates distinct geometry recognizable
/// as its real-world counterpart.
/// </summary>
public class RealisticPortGenerator : MonoBehaviour
{
    public static RealisticPortGenerator Instance { get; private set; }

    private GameObject _currentPort;
    private readonly List<Transform> _npcSpawnPoints = new List<Transform>();
    private readonly Dictionary<string, PortLayoutData> _layoutsByPort = new Dictionary<string, PortLayoutData>();

    // ─── Architecture Colors ──────────────────────────────────

    private readonly Dictionary<string, Color[]> _countryPalettes = new Dictionary<string, Color[]>
    {
        // {wall, roof, accent, ground}
        {"Spain",       new[]{ C(0.95f,0.92f,0.85f), C(0.7f,0.35f,0.2f),  C(0.2f,0.35f,0.6f),  C(0.75f,0.65f,0.5f) }},
        {"France",      new[]{ C(0.85f,0.82f,0.75f), C(0.3f,0.3f,0.35f),  C(0.3f,0.45f,0.65f), C(0.65f,0.6f,0.55f) }},
        {"Monaco",      new[]{ C(0.88f,0.85f,0.78f), C(0.35f,0.3f,0.3f),  C(0.7f,0.6f,0.3f),   C(0.7f,0.65f,0.58f) }},
        {"Italy",       new[]{ C(0.9f,0.75f,0.5f),   C(0.7f,0.35f,0.2f),  C(0.5f,0.2f,0.15f),  C(0.6f,0.55f,0.45f) }},
        {"Greece",      new[]{ C(0.95f,0.95f,0.98f), C(0.2f,0.4f,0.7f),   C(0.15f,0.35f,0.65f),C(0.8f,0.78f,0.72f) }},
        {"Turkey",      new[]{ C(0.8f,0.75f,0.65f),  C(0.5f,0.5f,0.45f),  C(0.1f,0.35f,0.45f), C(0.6f,0.55f,0.45f) }},
        {"Morocco",     new[]{ C(0.82f,0.6f,0.38f),  C(0.75f,0.55f,0.32f),C(0.15f,0.4f,0.25f), C(0.7f,0.6f,0.45f) }},
        {"Malta",       new[]{ C(0.82f,0.75f,0.58f), C(0.75f,0.68f,0.52f),C(0.2f,0.4f,0.3f),   C(0.7f,0.65f,0.5f) }},
        {"Croatia",     new[]{ C(0.8f,0.78f,0.7f),   C(0.7f,0.32f,0.18f), C(0.55f,0.25f,0.15f),C(0.65f,0.62f,0.55f) }},
        {"Israel",      new[]{ C(0.88f,0.85f,0.75f), C(0.6f,0.55f,0.45f), C(0.3f,0.4f,0.5f),   C(0.72f,0.68f,0.58f) }},
        {"Lebanon",     new[]{ C(0.85f,0.78f,0.65f), C(0.65f,0.5f,0.35f), C(0.6f,0.2f,0.15f),  C(0.68f,0.62f,0.5f) }},
        {"Egypt",       new[]{ C(0.85f,0.75f,0.55f), C(0.75f,0.6f,0.4f),  C(0.15f,0.35f,0.25f),C(0.75f,0.65f,0.5f) }},
    };

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        LoadLandmarkData();
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Generate a realistic port using landmark data.
    /// Falls back to generic layout if no landmark data exists.
    /// </summary>
    public List<Transform> GeneratePort(PortData port, Vector3 center)
    {
        if (_currentPort != null) Destroy(_currentPort);
        _npcSpawnPoints.Clear();

        if (!_layoutsByPort.TryGetValue(port.id, out var layout))
        {
            Debug.Log($"[PortGen] No landmark data for {port.id} — using generic layout");
            return PortEnvironmentGenerator.Instance?.GeneratePort(port.name, port.country, center)
                   ?? new List<Transform>();
        }

        _currentPort = new GameObject($"Port_{port.name}");
        _currentPort.transform.position = center;

        Color[] palette = GetPalette(port.country);

        // ─── Generate each landmark ─────────────────────────
        foreach (var lm in layout.landmarks)
        {
            Vector3 lmCenter = center + new Vector3(lm.posX, 0, lm.posZ);
            Vector3 lmSize = new Vector3(lm.sizeX, 0, lm.sizeZ);

            var landmarkGO = GenerateLandmark(lm, lmCenter, lmSize, palette, port.country);

            // Place NPC spawn point at this landmark
            if (!string.IsNullOrEmpty(lm.npc))
            {
                var spawnPt = CreateSpawnPoint(landmarkGO, lm.npc,
                    lmCenter + new Vector3(lmSize.x * 0.3f, 0, lmSize.z * 0.2f));
                _npcSpawnPoints.Add(spawnPt);
            }

            // Place a landmark sign
            CreateLandmarkSign(landmarkGO, lm.name, lmCenter + Vector3.up * 3.5f);

            // Note board if cultural note exists
            if (!string.IsNullOrEmpty(lm.note))
            {
                CreateInfoBoard(landmarkGO, lm.note,
                    lmCenter + new Vector3(-lmSize.x * 0.4f, 0, -lmSize.z * 0.4f));
            }
        }

        // ─── Connect landmarks with paths ────────────────────
        GeneratePaths(layout.landmarks, center, palette[3]);

        // ─── Ground plane ────────────────────────────────────
        CreateGround(center, palette[3], 400f);

        Debug.Log($"[PortGen] 🏛️ Generated realistic {port.name} with {layout.landmarks.Count} landmarks, {_npcSpawnPoints.Count} NPC positions");
        return _npcSpawnPoints;
    }

    public void ClearPort()
    {
        if (_currentPort != null) Destroy(_currentPort);
        _npcSpawnPoints.Clear();
    }

    // ─── Landmark Type Generators ─────────────────────────────

    GameObject GenerateLandmark(LandmarkData lm, Vector3 center, Vector3 size, Color[] palette, string country)
    {
        var go = new GameObject(lm.name);
        go.transform.SetParent(_currentPort.transform, false);
        go.transform.position = center;

        switch (lm.type)
        {
            case "marina":
                BuildMarina(go, size, palette); break;
            case "market":
            case "bazaar":
                BuildMarket(go, size, palette, lm.type == "bazaar"); break;
            case "square":
                BuildSquare(go, size, palette); break;
            case "street":
                BuildStreet(go, size, palette); break;
            case "waterfront":
                BuildWaterfront(go, size, palette); break;
            case "monument":
                BuildMonument(go, size, palette); break;
            case "religious":
                BuildReligious(go, size, palette, country); break;
            case "fortress":
                BuildFortress(go, size, palette); break;
            case "museum":
                BuildMuseum(go, size, palette); break;
            case "ruins":
                BuildRuins(go, size, palette); break;
            case "old_quarter":
                BuildOldQuarter(go, size, palette); break;
            case "restaurant_row":
                BuildRestaurantRow(go, size, palette); break;
            case "park":
                BuildPark(go, size, palette); break;
            case "beach":
                BuildBeach(go, size); break;
            case "tower":
                BuildTower(go, size, palette); break;
            case "gate":
                BuildGate(go, size, palette); break;
            case "harbor":
                BuildHarbor(go, size, palette); break;
            case "theater":
                BuildTheater(go, size, palette); break;
            default:
                BuildGeneric(go, size, palette); break;
        }

        return go;
    }

    // ─── Type-Specific Builders ───────────────────────────────

    void BuildMarina(GameObject parent, Vector3 size, Color[] p)
    {
        // Quay wall
        Box(parent, "Quay", V3(0, 0.5f, 0), V3(size.x, 1, 3), C(0.4f, 0.4f, 0.35f));

        // Pontoons
        int pontoons = Mathf.Max(3, (int)(size.x / 15f));
        for (int i = 0; i < pontoons; i++)
        {
            float x = -size.x / 2f + (i + 0.5f) * (size.x / pontoons);
            Box(parent, $"Pontoon_{i}", V3(x, 0.1f, -size.z / 2f),
                V3(2f, 0.3f, size.z * 0.8f), C(0.5f, 0.4f, 0.3f));
        }

        // Harbor office
        Box(parent, "HarborOffice", V3(size.x / 2f - 5f, 1.5f, 2f),
            V3(6f, 3f, 5f), p[0]);
        Box(parent, "HarborRoof", V3(size.x / 2f - 5f, 3.2f, 2f),
            V3(7f, 0.3f, 6f), p[1]);

        // Fuel dock
        Box(parent, "FuelDock", V3(-size.x / 2f + 3f, 0.8f, 0),
            V3(4f, 1.6f, 3f), C(0.8f, 0.2f, 0.15f));

        // Bollards
        for (int i = 0; i < (int)(size.x / 8f); i++)
        {
            Cyl(parent, $"Bollard_{i}", V3(-size.x / 2f + 4f + i * 8f, 0.3f, 1f),
                V3(0.3f, 0.3f, 0.3f), C(0.25f, 0.25f, 0.25f));
        }
    }

    void BuildMarket(GameObject parent, Vector3 size, Color[] p, bool isBazaar)
    {
        int stalls = Mathf.Max(4, (int)(size.x / 5f));
        Color[] awnings = { C(0.8f,0.2f,0.15f), C(0.1f,0.35f,0.55f), C(0.7f,0.5f,0.15f), C(0.15f,0.45f,0.2f), C(0.6f,0.3f,0.1f) };

        // Market ground
        Box(parent, "Floor", V3(0, 0.02f, 0), V3(size.x, 0.04f, size.z), p[3]);

        for (int i = 0; i < stalls; i++)
        {
            float x = -size.x / 2f + (i + 0.5f) * (size.x / stalls);
            // Stall body
            Box(parent, $"Stall_{i}", V3(x, 1f, 0), V3(3.5f, 2f, 2.5f), p[2]);
            // Awning
            Box(parent, $"Awning_{i}", V3(x, 2.2f, -0.3f), V3(4f, 0.05f, 3.2f), awnings[i % awnings.Length]);
            // Goods (colorful cubes on counter)
            for (int j = 0; j < 3; j++)
            {
                float gx = x - 0.8f + j * 0.8f;
                Box(parent, $"Goods_{i}_{j}", V3(gx, 1.2f, -0.5f), V3(0.4f, 0.3f, 0.3f),
                    awnings[(i + j) % awnings.Length]);
            }
        }

        if (isBazaar)
        {
            // Covered bazaar — add roof and walls
            Box(parent, "BazaarRoof", V3(0, 4f, 0), V3(size.x + 2f, 0.3f, size.z + 2f), p[1]);
            // Entrance arches
            Box(parent, "Arch_1", V3(-size.x / 2f - 1f, 2f, 0), V3(1f, 4f, 5f), p[0]);
            Box(parent, "Arch_2", V3(size.x / 2f + 1f, 2f, 0), V3(1f, 4f, 5f), p[0]);
        }
    }

    void BuildSquare(GameObject parent, Vector3 size, Color[] p)
    {
        // Paved surface
        Box(parent, "Paving", V3(0, 0.03f, 0), V3(size.x, 0.06f, size.z), C(0.7f, 0.65f, 0.55f));

        // Central fountain
        Cyl(parent, "Fountain", V3(0, 0.6f, 0), V3(size.x * 0.2f, 0.6f, size.x * 0.2f), C(0.6f, 0.6f, 0.55f));
        Cyl(parent, "FountainSpout", V3(0, 1.5f, 0), V3(0.2f, 0.9f, 0.2f), C(0.5f, 0.5f, 0.45f));

        // Surrounding buildings
        for (int i = 0; i < 4; i++)
        {
            float angle = i * 90f * Mathf.Deg2Rad;
            float dist = Mathf.Max(size.x, size.z) / 2f + 5f;
            float h = UnityEngine.Random.Range(6f, 14f);
            Box(parent, $"Building_{i}",
                V3(Mathf.Sin(angle) * dist, h / 2f, Mathf.Cos(angle) * dist),
                V3(8f, h, 6f), p[0]);
            Box(parent, $"Roof_{i}",
                V3(Mathf.Sin(angle) * dist, h + 0.2f, Mathf.Cos(angle) * dist),
                V3(8.5f, 0.4f, 6.5f), p[1]);
        }

        // Café tables
        for (int i = 0; i < 4; i++)
        {
            Box(parent, $"CafeTable_{i}", V3(-3f + i * 2.5f, 0.4f, size.z / 2f + 2f),
                V3(0.8f, 0.05f, 0.8f), C(0.9f, 0.9f, 0.85f));
            Cyl(parent, $"Chair_{i}", V3(-3f + i * 2.5f, 0.25f, size.z / 2f + 3f),
                V3(0.2f, 0.25f, 0.2f), C(0.2f, 0.2f, 0.2f));
        }
    }

    void BuildStreet(GameObject parent, Vector3 size, Color[] p)
    {
        bool isLong = size.z > size.x;
        float length = isLong ? size.z : size.x;
        float width = isLong ? size.x : size.z;

        // Street surface
        Box(parent, "Street", V3(0, 0.02f, 0), V3(width, 0.04f, length), C(0.55f, 0.5f, 0.45f));

        // Buildings on both sides
        int buildings = (int)(length / 8f);
        for (int i = 0; i < buildings; i++)
        {
            float z = -length / 2f + (i + 0.5f) * (length / buildings);
            float h1 = UnityEngine.Random.Range(5f, 12f);
            float h2 = UnityEngine.Random.Range(5f, 12f);

            // Left side
            Box(parent, $"BldL_{i}", V3(-width / 2f - 4f, h1 / 2f, z), V3(7f, h1, 7f), p[0]);
            Box(parent, $"RoofL_{i}", V3(-width / 2f - 4f, h1 + 0.2f, z), V3(7.5f, 0.4f, 7.5f), p[1]);

            // Right side
            Box(parent, $"BldR_{i}", V3(width / 2f + 4f, h2 / 2f, z), V3(7f, h2, 7f), p[0]);
            Box(parent, $"RoofR_{i}", V3(width / 2f + 4f, h2 + 0.2f, z), V3(7.5f, 0.4f, 7.5f), p[1]);

            // Doors and windows
            Box(parent, $"DoorL_{i}", V3(-width / 2f - 0.5f, 1.1f, z), V3(0.05f, 2.2f, 1f), C(0.3f, 0.2f, 0.1f));
            Box(parent, $"DoorR_{i}", V3(width / 2f + 0.5f, 1.1f, z), V3(0.05f, 2.2f, 1f), C(0.3f, 0.2f, 0.1f));
        }

        // Street lamps
        for (int i = 0; i < buildings / 2; i++)
        {
            float z = -length / 2f + (i * 2 + 1) * (length / buildings);
            Cyl(parent, $"Lamp_{i}", V3(-width / 2f + 0.5f, 2f, z), V3(0.06f, 2f, 0.06f), C(0.2f, 0.2f, 0.2f));
            Sph(parent, $"LampGlow_{i}", V3(-width / 2f + 0.5f, 4.2f, z), V3(0.3f, 0.3f, 0.3f), C(1f, 0.9f, 0.6f));
        }
    }

    void BuildReligious(GameObject parent, Vector3 size, Color[] p, string country)
    {
        // Adapt to culture
        bool isMosque = country == "Turkey" || country == "Morocco" || country == "Tunisia" ||
                        country == "Algeria" || country == "Egypt" || country == "Libya";

        if (isMosque)
        {
            // Mosque body
            Box(parent, "MosqueBody", V3(0, size.x * 0.4f, 0), V3(size.x, size.x * 0.8f, size.z), p[0]);
            // Dome
            Sph(parent, "Dome", V3(0, size.x * 0.8f, 0), V3(size.x * 0.6f, size.x * 0.4f, size.z * 0.6f), C(0.6f, 0.6f, 0.55f));
            // Minaret
            Cyl(parent, "Minaret", V3(size.x * 0.5f, size.x * 0.8f, 0), V3(0.8f, size.x * 0.8f, 0.8f), p[0]);
            Sph(parent, "MinaretTop", V3(size.x * 0.5f, size.x * 1.6f, 0), V3(1.5f, 1.5f, 1.5f), p[0]);
            // Crescent
            Sph(parent, "Crescent", V3(size.x * 0.5f, size.x * 1.7f + 0.8f, 0), V3(0.5f, 0.5f, 0.1f), C(0.85f, 0.75f, 0.2f));
            // Courtyard
            Box(parent, "Courtyard", V3(0, 0.02f, -size.z * 0.6f), V3(size.x * 0.8f, 0.04f, size.z * 0.4f), C(0.75f, 0.7f, 0.6f));
        }
        else
        {
            // Church/cathedral
            Box(parent, "Nave", V3(0, size.z * 0.3f, 0), V3(size.x * 0.6f, size.z * 0.6f, size.z), p[0]);
            // Facade
            Box(parent, "Facade", V3(0, size.z * 0.35f, -size.z / 2f), V3(size.x, size.z * 0.7f, 1f), p[0]);
            // Bell tower
            Box(parent, "BellTower", V3(-size.x * 0.35f, size.z * 0.6f, -size.z / 2f + 2f), V3(3f, size.z * 1.2f, 3f), p[0]);
            // Cross
            Box(parent, "Cross_V", V3(-size.x * 0.35f, size.z * 1.25f, -size.z / 2f + 2f), V3(0.2f, 1.5f, 0.2f), C(0.8f, 0.75f, 0.2f));
            Box(parent, "Cross_H", V3(-size.x * 0.35f, size.z * 1.35f, -size.z / 2f + 2f), V3(0.8f, 0.2f, 0.2f), C(0.8f, 0.75f, 0.2f));
            // Steps
            for (int i = 0; i < 5; i++)
            {
                Box(parent, $"Step_{i}", V3(0, i * 0.15f, -size.z / 2f - 1f - i * 0.5f),
                    V3(size.x * 0.8f - i * 0.5f, 0.15f, 0.5f), p[3]);
            }

            bool isGreek = country == "Greece" || country == "Greece (Crete)" || country == "Cyprus";
            if (isGreek)
            {
                // Blue dome (replace roof)
                Sph(parent, "BlueDome", V3(0, size.z * 0.55f, size.z * 0.2f),
                    V3(size.x * 0.5f, size.z * 0.3f, size.z * 0.4f), p[1]); // Blue!
            }
        }
    }

    void BuildFortress(GameObject parent, Vector3 size, Color[] p)
    {
        float wallH = Mathf.Max(8f, size.x * 0.15f);
        float wallW = 2f;
        Color stone = C(0.6f, 0.55f, 0.45f);

        // Four walls
        Box(parent, "Wall_N", V3(0, wallH / 2f, size.z / 2f), V3(size.x, wallH, wallW), stone);
        Box(parent, "Wall_S", V3(0, wallH / 2f, -size.z / 2f), V3(size.x, wallH, wallW), stone);
        Box(parent, "Wall_E", V3(size.x / 2f, wallH / 2f, 0), V3(wallW, wallH, size.z), stone);
        Box(parent, "Wall_W", V3(-size.x / 2f, wallH / 2f, 0), V3(wallW, wallH, size.z), stone);

        // Corner towers
        float towerH = wallH * 1.5f;
        for (int i = 0; i < 4; i++)
        {
            float x = (i % 2 == 0 ? -1 : 1) * size.x / 2f;
            float z = (i < 2 ? -1 : 1) * size.z / 2f;
            Cyl(parent, $"Tower_{i}", V3(x, towerH / 2f, z), V3(3f, towerH / 2f, 3f), stone);
            // Battlement ring
            for (int j = 0; j < 8; j++)
            {
                float angle = j * 45f * Mathf.Deg2Rad;
                Box(parent, $"Tower{i}_Merlon_{j}",
                    V3(x + Mathf.Sin(angle) * 1.5f, towerH + 0.3f, z + Mathf.Cos(angle) * 1.5f),
                    V3(0.6f, 0.6f, 0.6f), stone);
            }
        }

        // Gate
        Box(parent, "GateFrame", V3(0, wallH * 0.4f, -size.z / 2f), V3(4f, wallH * 0.8f, wallW + 0.5f), C(0.45f, 0.4f, 0.3f));
        // Interior keep
        Box(parent, "Keep", V3(0, wallH * 0.6f, size.z * 0.2f), V3(size.x * 0.3f, wallH * 1.2f, size.z * 0.3f), stone);
    }

    void BuildMuseum(GameObject parent, Vector3 size, Color[] p)
    {
        Box(parent, "Body", V3(0, size.z * 0.3f, 0), V3(size.x, size.z * 0.6f, size.z), p[0]);
        // Grand entrance
        for (int i = 0; i < 4; i++)
        {
            Cyl(parent, $"Column_{i}", V3(-size.x / 3f + i * size.x / 4.5f, size.z * 0.3f, -size.z / 2f - 0.5f),
                V3(0.5f, size.z * 0.3f, 0.5f), C(0.8f, 0.78f, 0.72f));
        }
        // Pediment
        Box(parent, "Pediment", V3(0, size.z * 0.65f, -size.z / 2f - 0.5f),
            V3(size.x * 0.8f, 0.5f, 1f), p[0]);
        // Steps
        for (int i = 0; i < 3; i++)
        {
            Box(parent, $"Step_{i}", V3(0, i * 0.15f, -size.z / 2f - 1.5f - i * 0.4f),
                V3(size.x * 0.6f, 0.15f, 0.4f), p[3]);
        }
    }

    void BuildRuins(GameObject parent, Vector3 size, Color[] p)
    {
        Color stone = C(0.75f, 0.7f, 0.6f);
        // Broken columns
        int cols = Mathf.Max(4, (int)(size.x / 5f));
        for (int i = 0; i < cols; i++)
        {
            float x = UnityEngine.Random.Range(-size.x / 2f, size.x / 2f);
            float z = UnityEngine.Random.Range(-size.z / 2f, size.z / 2f);
            float h = UnityEngine.Random.Range(1f, 5f);
            Cyl(parent, $"Column_{i}", V3(x, h / 2f, z), V3(0.5f, h / 2f, 0.5f), stone);
        }
        // Foundation blocks
        for (int i = 0; i < 6; i++)
        {
            float x = UnityEngine.Random.Range(-size.x / 2f, size.x / 2f);
            float z = UnityEngine.Random.Range(-size.z / 2f, size.z / 2f);
            Box(parent, $"Block_{i}", V3(x, 0.3f, z), V3(2f, 0.6f, 1.5f), stone);
        }
        // Ground
        Box(parent, "RuinsGround", V3(0, 0.01f, 0), V3(size.x, 0.02f, size.z), C(0.7f, 0.65f, 0.55f));
    }

    void BuildOldQuarter(GameObject parent, Vector3 size, Color[] p)
    {
        // Dense grid of buildings with narrow alleys
        int rows = Mathf.Max(3, (int)(size.z / 12f));
        int cols = Mathf.Max(3, (int)(size.x / 10f));

        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < cols; c++)
            {
                float x = -size.x / 2f + (c + 0.5f) * (size.x / cols);
                float z = -size.z / 2f + (r + 0.5f) * (size.z / rows);
                float h = UnityEngine.Random.Range(4f, 10f);
                float w = UnityEngine.Random.Range(4f, 8f);

                Box(parent, $"Bld_{r}_{c}", V3(x, h / 2f, z), V3(w, h, 7f),
                    Color.Lerp(p[0], p[2], UnityEngine.Random.Range(0f, 0.2f)));
                Box(parent, $"Roof_{r}_{c}", V3(x, h + 0.15f, z), V3(w + 0.3f, 0.3f, 7.3f), p[1]);
            }
        }
    }

    void BuildWaterfront(GameObject parent, Vector3 size, Color[] p)
    {
        Box(parent, "Promenade", V3(0, 0.05f, 0), V3(size.x, 0.1f, size.z + 3f), C(0.72f, 0.68f, 0.58f));
        Box(parent, "SeaWall", V3(0, 0.5f, -size.z / 2f - 1f), V3(size.x, 1f, 1f), C(0.5f, 0.48f, 0.42f));
        // Railing
        for (int i = 0; i < (int)(size.x / 3f); i++)
        {
            Cyl(parent, $"Rail_{i}", V3(-size.x / 2f + i * 3f + 1.5f, 0.7f, -size.z / 2f),
                V3(0.03f, 0.7f, 0.03f), C(0.2f, 0.2f, 0.2f));
        }
    }

    void BuildMonument(GameObject parent, Vector3 size, Color[] p)
    {
        Box(parent, "Base", V3(0, 0.4f, 0), V3(size.x * 0.3f, 0.8f, size.z * 0.3f), C(0.6f, 0.58f, 0.5f));
        Cyl(parent, "Pillar", V3(0, 4f, 0), V3(1.2f, 3.5f, 1.2f), C(0.7f, 0.68f, 0.6f));
        Sph(parent, "TopPiece", V3(0, 8f, 0), V3(2f, 2.5f, 2f), C(0.65f, 0.6f, 0.5f));
    }

    void BuildRestaurantRow(GameObject parent, Vector3 size, Color[] p)
    {
        int restaurants = Mathf.Max(3, (int)(Mathf.Max(size.x, size.z) / 8f));
        bool isLong = size.z > size.x;
        for (int i = 0; i < restaurants; i++)
        {
            float pos = -Mathf.Max(size.x, size.z) / 2f + (i + 0.5f) * (Mathf.Max(size.x, size.z) / restaurants);
            float px = isLong ? 0 : pos;
            float pz = isLong ? pos : 0;
            Box(parent, $"Rest_{i}", V3(px, 2f, pz), V3(6f, 4f, 5f), p[0]);
            // Terrace
            for (int j = 0; j < 2; j++)
            {
                Box(parent, $"Table_{i}_{j}", V3(px - 2f + j * 2.5f, 0.4f, pz + 3.5f),
                    V3(0.8f, 0.05f, 0.8f), C(0.9f, 0.88f, 0.82f));
            }
        }
    }

    void BuildPark(GameObject parent, Vector3 size, Color[] p)
    {
        Box(parent, "Grass", V3(0, 0.01f, 0), V3(size.x, 0.02f, size.z), C(0.3f, 0.5f, 0.2f));
        // Trees
        int trees = Mathf.Max(4, (int)(size.x * size.z / 100f));
        for (int i = 0; i < trees; i++)
        {
            float x = UnityEngine.Random.Range(-size.x * 0.4f, size.x * 0.4f);
            float z = UnityEngine.Random.Range(-size.z * 0.4f, size.z * 0.4f);
            Cyl(parent, $"Trunk_{i}", V3(x, 2f, z), V3(0.25f, 2f, 0.25f), C(0.4f, 0.3f, 0.2f));
            Sph(parent, $"Canopy_{i}", V3(x, 4.5f, z), V3(3f, 2.5f, 3f), C(0.2f, 0.45f, 0.15f));
        }
        // Path
        Box(parent, "Path", V3(0, 0.03f, 0), V3(2f, 0.04f, size.z), C(0.6f, 0.55f, 0.45f));
        // Viewpoint railing
        Box(parent, "Viewpoint", V3(size.x / 2f - 1f, 0.5f, 0), V3(2f, 1f, 3f), C(0.5f, 0.48f, 0.4f));
    }

    void BuildBeach(GameObject parent, Vector3 size)
    {
        Box(parent, "Sand", V3(0, -0.05f, 0), V3(size.x, 0.1f, size.z), C(0.9f, 0.85f, 0.7f));
        // Umbrellas
        int umbrellas = Mathf.Max(3, (int)(size.x / 10f));
        for (int i = 0; i < umbrellas; i++)
        {
            float x = UnityEngine.Random.Range(-size.x * 0.4f, size.x * 0.4f);
            Cyl(parent, $"UmbPole_{i}", V3(x, 1f, 0), V3(0.04f, 1f, 0.04f), C(0.5f, 0.4f, 0.3f));
            Sph(parent, $"UmbTop_{i}", V3(x, 2.2f, 0), V3(2.5f, 0.5f, 2.5f),
                i % 2 == 0 ? C(0.9f, 0.3f, 0.2f) : C(0.2f, 0.4f, 0.7f));
        }
    }

    void BuildTower(GameObject parent, Vector3 size, Color[] p)
    {
        Cyl(parent, "Tower", V3(0, size.x * 2f, 0), V3(size.x * 0.6f, size.x * 2f, size.z * 0.6f), p[0]);
        // Top platform
        Cyl(parent, "TopPlatform", V3(0, size.x * 4f + 0.2f, 0), V3(size.x * 0.8f, 0.3f, size.z * 0.8f), p[0]);
        // Observation ring
        for (int i = 0; i < 8; i++)
        {
            float angle = i * 45f * Mathf.Deg2Rad;
            float r = size.x * 0.35f;
            Box(parent, $"Merlon_{i}", V3(Mathf.Sin(angle) * r, size.x * 4f + 0.6f, Mathf.Cos(angle) * r),
                V3(0.4f, 0.5f, 0.4f), p[0]);
        }
    }

    void BuildGate(GameObject parent, Vector3 size, Color[] p)
    {
        // Two pillars with arch
        Box(parent, "Pillar_L", V3(-size.x / 2f + 1f, size.z * 0.6f, 0), V3(2f, size.z * 1.2f, 3f), p[0]);
        Box(parent, "Pillar_R", V3(size.x / 2f - 1f, size.z * 0.6f, 0), V3(2f, size.z * 1.2f, 3f), p[0]);
        Box(parent, "Arch", V3(0, size.z * 1.1f, 0), V3(size.x, 1.5f, 3f), p[0]);
    }

    void BuildHarbor(GameObject parent, Vector3 size, Color[] p)
    {
        BuildMarina(parent, size, p);
    }

    void BuildTheater(GameObject parent, Vector3 size, Color[] p)
    {
        // Semi-circular seating
        for (int row = 0; row < 5; row++)
        {
            float r = 5f + row * 2.5f;
            float h = row * 0.5f;
            for (int seg = 0; seg < 8; seg++)
            {
                float angle = (seg - 3.5f) * 15f * Mathf.Deg2Rad;
                Box(parent, $"Seat_{row}_{seg}",
                    V3(Mathf.Sin(angle) * r, h + 0.2f, Mathf.Cos(angle) * r),
                    V3(2.5f, 0.4f, 1.5f), C(0.65f, 0.6f, 0.5f));
            }
        }
        // Stage
        Box(parent, "Stage", V3(0, 0.3f, -2f), V3(size.x * 0.6f, 0.6f, 4f), C(0.5f, 0.38f, 0.22f));
    }

    void BuildGeneric(GameObject parent, Vector3 size, Color[] p)
    {
        Box(parent, "Building", V3(0, 4f, 0), V3(size.x, 8f, size.z), p[0]);
        Box(parent, "Roof", V3(0, 8.2f, 0), V3(size.x + 0.5f, 0.4f, size.z + 0.5f), p[1]);
    }

    // ─── Path Generation ──────────────────────────────────────

    void GeneratePaths(List<LandmarkData> landmarks, Vector3 center, Color pathColor)
    {
        for (int i = 0; i < landmarks.Count - 1; i++)
        {
            Vector3 from = center + V3(landmarks[i].posX, 0.03f, landmarks[i].posZ);
            Vector3 to = center + V3(landmarks[i + 1].posX, 0.03f, landmarks[i + 1].posZ);
            Vector3 mid = (from + to) / 2f;
            Vector3 dir = to - from;
            float dist = dir.magnitude;

            var path = GameObject.CreatePrimitive(PrimitiveType.Cube);
            path.name = $"Path_{i}";
            path.transform.SetParent(_currentPort.transform, false);
            path.transform.position = mid;
            path.transform.localScale = new Vector3(2.5f, 0.06f, dist);
            path.transform.rotation = Quaternion.LookRotation(dir.normalized, Vector3.up);
            path.GetComponent<Renderer>().material.color = pathColor;
            path.isStatic = true;
        }
    }

    // ─── Signs & Info ─────────────────────────────────────────

    void CreateLandmarkSign(GameObject parent, string name, Vector3 position)
    {
        var signPost = new GameObject($"Sign_{name}");
        signPost.transform.SetParent(parent.transform, false);
        signPost.transform.position = position;

        // Sign board
        var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
        board.name = "Board";
        board.transform.SetParent(signPost.transform, false);
        board.transform.localScale = new Vector3(Mathf.Min(name.Length * 0.12f + 0.5f, 4f), 0.4f, 0.05f);
        board.GetComponent<Renderer>().material.color = new Color(0.15f, 0.25f, 0.4f);

        // World-space canvas for text
        var canvasGO = new GameObject("SignCanvas");
        canvasGO.transform.SetParent(signPost.transform, false);
        canvasGO.transform.localPosition = Vector3.forward * -0.03f;

        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.WorldSpace;
        var rect = canvasGO.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(4f, 0.4f);
        rect.localScale = V3(0.01f, 0.01f, 0.01f);

        var textGO = new GameObject("Text");
        textGO.transform.SetParent(canvasGO.transform, false);
        var text = textGO.AddComponent<Text>();
        text.text = name;
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = 14;
        text.color = Color.white;
        text.alignment = TextAnchor.MiddleCenter;
        var textRect = textGO.GetComponent<RectTransform>();
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = textRect.offsetMax = Vector2.zero;
    }

    void CreateInfoBoard(GameObject parent, string info, Vector3 position)
    {
        var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
        board.name = "InfoBoard";
        board.transform.SetParent(parent.transform, false);
        board.transform.position = position;
        board.transform.localScale = new Vector3(1.2f, 1.5f, 0.05f);
        board.GetComponent<Renderer>().material.color = new Color(0.6f, 0.5f, 0.35f);

        // Info text would be displayed via interaction trigger
        // For now, it's a physical info stand the player can approach
    }

    Transform CreateSpawnPoint(GameObject parent, string npcName, Vector3 worldPos)
    {
        var go = new GameObject($"NPCSpawn_{npcName}");
        go.transform.SetParent(parent.transform, false);
        go.transform.position = worldPos;
        return go.transform;
    }

    void CreateGround(Vector3 center, Color color, float size)
    {
        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "PortGround";
        ground.transform.SetParent(_currentPort.transform, false);
        ground.transform.position = center + Vector3.up * 0.01f;
        ground.transform.localScale = V3(size / 10f, 1, size / 10f);
        ground.GetComponent<Renderer>().material.color = color;
    }

    // ─── Data Loading ─────────────────────────────────────────

    void LoadLandmarkData()
    {
        string path = Path.Combine(Application.streamingAssetsPath, "ports-registry", "port-landmarks.yaml");
        if (!File.Exists(path))
        {
            Debug.Log("[PortGen] No landmark file found — using generic layouts");
            return;
        }

        string yaml = File.ReadAllText(path);
        ParseLandmarkYAML(yaml);
        Debug.Log($"[PortGen] 🏛️ Loaded landmark data for {_layoutsByPort.Count} ports");
    }

    void ParseLandmarkYAML(string yaml)
    {
        string currentPortId = null;
        PortLayoutData currentLayout = null;

        foreach (string rawLine in yaml.Split('\n'))
        {
            string line = rawLine.TrimEnd('\r');
            string trimmed = line.TrimStart();

            // Port ID (e.g., "  loc_barcelona:")
            var portMatch = Regex.Match(line, @"^  (loc_\w+):");
            if (portMatch.Success)
            {
                currentPortId = portMatch.Groups[1].Value;
                currentLayout = new PortLayoutData { portId = currentPortId };
                _layoutsByPort[currentPortId] = currentLayout;
                continue;
            }

            if (currentLayout == null) continue;

            if (trimmed.StartsWith("layout_style:"))
            {
                currentLayout.layoutStyle = trimmed.Substring("layout_style:".Length).Trim();
            }
            else if (trimmed.StartsWith("- {name:"))
            {
                var lm = ParseLandmarkLine(trimmed);
                if (lm != null) currentLayout.landmarks.Add(lm);
            }
        }
    }

    LandmarkData ParseLandmarkLine(string line)
    {
        var lm = new LandmarkData();
        lm.name = ExtractField(line, "name");
        lm.type = ExtractField(line, "type");
        lm.note = ExtractField(line, "note");
        lm.npc = ExtractField(line, "npc");

        var posMatch = Regex.Match(line, @"pos:\s*\[(\-?[\d.]+),\s*(\-?[\d.]+)\]");
        if (posMatch.Success)
        {
            float.TryParse(posMatch.Groups[1].Value, out lm.posX);
            float.TryParse(posMatch.Groups[2].Value, out lm.posZ);
        }

        var sizeMatch = Regex.Match(line, @"size:\s*\[(\-?[\d.]+),\s*(\-?[\d.]+)\]");
        if (sizeMatch.Success)
        {
            float.TryParse(sizeMatch.Groups[1].Value, out lm.sizeX);
            float.TryParse(sizeMatch.Groups[2].Value, out lm.sizeZ);
        }

        return string.IsNullOrEmpty(lm.name) ? null : lm;
    }

    string ExtractField(string line, string key)
    {
        var match = Regex.Match(line, key + @":\s*""([^""]+)""");
        if (!match.Success)
            match = Regex.Match(line, key + @":\s*([^,}]+)");
        return match.Success ? match.Groups[1].Value.Trim().Trim('"') : "";
    }

    Color[] GetPalette(string country)
    {
        if (_countryPalettes.TryGetValue(country, out var pal)) return pal;
        // Try partial match
        foreach (var kvp in _countryPalettes)
            if (country.Contains(kvp.Key) || kvp.Key.Contains(country)) return kvp.Value;
        return new[] { C(0.8f,0.78f,0.72f), C(0.6f,0.35f,0.25f), C(0.4f,0.3f,0.25f), C(0.65f,0.6f,0.5f) };
    }

    // ─── Shorthand Helpers ────────────────────────────────────

    static Color C(float r, float g, float b) => new Color(r, g, b);
    static Vector3 V3(float x, float y, float z) => new Vector3(x, y, z);

    GameObject Box(GameObject p, string n, Vector3 pos, Vector3 s, Color c)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = n; go.transform.SetParent(p.transform, false);
        go.transform.localPosition = pos; go.transform.localScale = s;
        go.GetComponent<Renderer>().material.color = c; go.isStatic = true;
        return go;
    }
    GameObject Cyl(GameObject p, string n, Vector3 pos, Vector3 s, Color c)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = n; go.transform.SetParent(p.transform, false);
        go.transform.localPosition = pos; go.transform.localScale = s;
        go.GetComponent<Renderer>().material.color = c; go.isStatic = true;
        return go;
    }
    GameObject Sph(GameObject p, string n, Vector3 pos, Vector3 s, Color c)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = n; go.transform.SetParent(p.transform, false);
        go.transform.localPosition = pos; go.transform.localScale = s;
        go.GetComponent<Renderer>().material.color = c; go.isStatic = true;
        return go;
    }
}
