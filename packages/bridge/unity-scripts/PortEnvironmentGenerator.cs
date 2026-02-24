/*
 * PortEnvironmentGenerator.cs — Procedural port/city environment.
 *
 * SETUP:
 *   1. Attach to a persistent GameObject
 *   2. Generates the walkable port environment when player docks
 *   3. Creates: marina, waterfront, market square, old town streets,
 *      and places NPCs at their assigned locations
 *
 * Each port gets a unique layout based on its cultural_highlight and
 * geographic template. Mediterranean architectural styles:
 *   - Spanish: terracotta + white walls + arches
 *   - French: limestone + blue shutters + wrought iron
 *   - Italian: warm ochre + terracotta roofs + narrow alleys
 *   - Greek: white + blue domes + stepped paths
 *   - Turkish: stone + arched doorways + bazaar alleys
 *   - North African: medina walls + courtyard riads + spice colors
 *   - Croatian: stone + red roofs + fortified walls
 */

using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Generates a walkable port environment procedurally.
/// Creates buildings, streets, landmarks, and NPC spawn points.
/// </summary>
public class PortEnvironmentGenerator : MonoBehaviour
{
    [Header("Settings")]
    public float blockSize = 8f;
    public float streetWidth = 4f;
    public float buildingMinHeight = 3f;
    public float buildingMaxHeight = 12f;
    public int gridSize = 8; // 8x8 blocks

    [Header("Colors by Style")]
    public Color[] wallColors;
    public Color[] roofColors;
    public Color[] groundColors;

    // ─── Singleton ────────────────────────────────────────────

    public static PortEnvironmentGenerator Instance { get; private set; }

    // ─── State ────────────────────────────────────────────────

    private GameObject _currentPort;
    private readonly List<Transform> _npcSpawnPoints = new List<Transform>();
    private string _currentStyle = "mediterranean";

    // ─── Architecture Styles ──────────────────────────────────

    public enum ArchStyle { Spanish, French, Italian, Greek, Turkish, NorthAfrican, Croatian, Maltese, Generic }

    private static readonly Dictionary<string, ArchStyle> CountryStyles = new Dictionary<string, ArchStyle>
    {
        {"Spain", ArchStyle.Spanish}, {"Gibraltar (UK)", ArchStyle.Spanish},
        {"France", ArchStyle.French}, {"France (Corsica)", ArchStyle.French}, {"Monaco", ArchStyle.French},
        {"Italy", ArchStyle.Italian}, {"Italy (Sicily)", ArchStyle.Italian}, {"Italy (Sardinia)", ArchStyle.Italian},
        {"Greece", ArchStyle.Greek}, {"Greece (Crete)", ArchStyle.Greek},
        {"Turkey", ArchStyle.Turkish},
        {"Morocco", ArchStyle.NorthAfrican}, {"Tunisia", ArchStyle.NorthAfrican},
        {"Algeria", ArchStyle.NorthAfrican}, {"Egypt", ArchStyle.NorthAfrican}, {"Libya", ArchStyle.NorthAfrican},
        {"Croatia", ArchStyle.Croatian}, {"Montenegro", ArchStyle.Croatian}, {"Slovenia", ArchStyle.Croatian},
        {"Malta", ArchStyle.Maltese},
        {"Albania", ArchStyle.Generic}, {"Cyprus", ArchStyle.Greek},
        {"Israel", ArchStyle.Generic}, {"Lebanon", ArchStyle.NorthAfrican},
    };

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Generate a port environment for the given city.
    /// Returns a list of NPC spawn points for the NPCSpawner.
    /// </summary>
    public List<Transform> GeneratePort(string cityName, string country, Vector3 center)
    {
        // Clean up previous port
        if (_currentPort != null) Destroy(_currentPort);
        _npcSpawnPoints.Clear();

        ArchStyle style = ArchStyle.Generic;
        if (CountryStyles.ContainsKey(country))
            style = CountryStyles[country];

        _currentPort = new GameObject($"Port_{cityName}");
        _currentPort.transform.position = center;

        // Get style colors
        var colors = GetStyleColors(style);

        // ─── Generate Port Zones ──────────────────────────

        // Zone 1: Marina / waterfront
        GenerateMarina(center, colors, style);

        // Zone 2: Waterfront promenade
        GeneratePromenade(center + Vector3.right * 30f, colors);

        // Zone 3: Market square
        GenerateMarketSquare(center + new Vector3(50f, 0, 20f), colors, style);

        // Zone 4: Old town streets
        GenerateOldTown(center + new Vector3(40f, 0, 50f), colors, style);

        // Zone 5: Landmark / cultural site
        GenerateLandmark(center + new Vector3(60f, 0, 70f), colors, style, cityName);

        // Zone 6: Harbor master / customs area
        GenerateOfficialBuildings(center + new Vector3(10f, 0, 5f), colors);

        // Ground plane
        CreateGround(center, colors.ground, 200f);

        Debug.Log($"[PortGen] 🏘️ Generated {cityName} ({style}) with {_npcSpawnPoints.Count} NPC positions");
        return _npcSpawnPoints;
    }

    /// <summary>Destroy the current port environment</summary>
    public void ClearPort()
    {
        if (_currentPort != null)
        {
            Destroy(_currentPort);
            _npcSpawnPoints.Clear();
        }
    }

    // ─── Zone Generators ──────────────────────────────────────

    void GenerateMarina(Vector3 origin, StyleColors colors, ArchStyle style)
    {
        var zone = CreateZone("Marina", origin);

        // Quay wall
        CreateBox(zone, "Quay", new Vector3(0, 0.5f, 0), new Vector3(60f, 1f, 3f),
            new Color(0.4f, 0.4f, 0.35f));

        // Pontoons (floating docks)
        for (int i = 0; i < 4; i++)
        {
            CreateBox(zone, $"Pontoon_{i}", new Vector3(-10f + i * 12f, 0.1f, -8f),
                new Vector3(2f, 0.3f, 15f), new Color(0.5f, 0.4f, 0.3f));
        }

        // Fuel station
        var fuelPoint = CreateBox(zone, "FuelStation", new Vector3(-20f, 0, 2f),
            new Vector3(4f, 3f, 4f), new Color(0.8f, 0.2f, 0.2f));
        AddNPCSpawnPoint(zone, "fuel-attendant", fuelPoint.transform.position + Vector3.right * 3f);

        // Harbor master office
        CreateBox(zone, "HarborMasterOffice", new Vector3(25f, 0, 3f),
            new Vector3(6f, 3.5f, 5f), colors.wall);
        AddNPCSpawnPoint(zone, "harbor-master", origin + new Vector3(25f, 0, 6f));

        // Bollards
        for (int i = 0; i < 10; i++)
        {
            CreateCylinder(zone, $"Bollard_{i}", new Vector3(-25f + i * 6f, 0.3f, 0.5f),
                new Vector3(0.3f, 0.3f, 0.3f), new Color(0.3f, 0.3f, 0.3f));
        }
    }

    void GeneratePromenade(Vector3 origin, StyleColors colors)
    {
        var zone = CreateZone("Promenade", origin);

        // Promenade surface
        CreateBox(zone, "PromenadePaving", new Vector3(0, 0.05f, 0),
            new Vector3(80f, 0.1f, 8f), new Color(0.75f, 0.7f, 0.65f));

        // Palm trees (cylinders + spheres)
        for (int i = 0; i < 8; i++)
        {
            var trunk = CreateCylinder(zone, $"Palm_{i}", new Vector3(-30f + i * 10f, 3f, -2f),
                new Vector3(0.3f, 3f, 0.3f), new Color(0.5f, 0.35f, 0.2f));
            var canopy = CreateSphere(zone, $"PalmCanopy_{i}", new Vector3(-30f + i * 10f, 6.5f, -2f),
                new Vector3(4f, 3f, 4f), new Color(0.2f, 0.5f, 0.15f));
        }

        // Benches
        for (int i = 0; i < 6; i++)
        {
            CreateBox(zone, $"Bench_{i}", new Vector3(-20f + i * 10f, 0.3f, 2f),
                new Vector3(2f, 0.5f, 0.6f), new Color(0.4f, 0.3f, 0.2f));
        }

        // Café terrace
        for (int i = 0; i < 3; i++)
        {
            CreateBox(zone, $"CafeTable_{i}", new Vector3(20f + i * 4f, 0.4f, -4f),
                new Vector3(1f, 0.4f, 1f), Color.white);
        }
        AddNPCSpawnPoint(zone, "cafe-server", origin + new Vector3(22f, 0, -5f));
    }

    void GenerateMarketSquare(Vector3 origin, StyleColors colors, ArchStyle style)
    {
        var zone = CreateZone("MarketSquare", origin);

        // Open square
        CreateBox(zone, "SquarePaving", new Vector3(0, 0.03f, 0),
            new Vector3(30f, 0.06f, 25f), new Color(0.7f, 0.65f, 0.55f));

        // Market stalls
        for (int i = 0; i < 5; i++)
        {
            // Stall frame
            CreateBox(zone, $"Stall_{i}", new Vector3(-10f + i * 5f, 1.2f, -5f),
                new Vector3(3.5f, 2.4f, 2.5f), colors.accent);

            // Awning
            CreateBox(zone, $"Awning_{i}", new Vector3(-10f + i * 5f, 2.5f, -5.5f),
                new Vector3(4f, 0.1f, 3.5f), GetAwningColor(i));
        }

        AddNPCSpawnPoint(zone, "market-vendor", origin + new Vector3(-8f, 0, -3f));
        AddNPCSpawnPoint(zone, "market-vendor-2", origin + new Vector3(2f, 0, -3f));

        // Fountain (center of square)
        CreateCylinder(zone, "Fountain", new Vector3(0, 0.8f, 5f),
            new Vector3(3f, 0.8f, 3f), new Color(0.6f, 0.6f, 0.55f));
        CreateCylinder(zone, "FountainSpout", new Vector3(0, 2f, 5f),
            new Vector3(0.3f, 1.2f, 0.3f), new Color(0.5f, 0.5f, 0.45f));

        // Surrounding buildings
        for (int i = 0; i < 4; i++)
        {
            float h = UnityEngine.Random.Range(buildingMinHeight, buildingMaxHeight);
            float angle = i * 90f;
            Vector3 pos = new Vector3(
                Mathf.Sin(angle * Mathf.Deg2Rad) * 18f,
                h / 2f,
                5f + Mathf.Cos(angle * Mathf.Deg2Rad) * 15f
            );
            CreateBox(zone, $"Building_{i}", pos,
                new Vector3(8f, h, 6f), colors.wall);
        }
    }

    void GenerateOldTown(Vector3 origin, StyleColors colors, ArchStyle style)
    {
        var zone = CreateZone("OldTown", origin);

        // Generate narrow streets with buildings on both sides
        for (int row = 0; row < 4; row++)
        {
            for (int col = 0; col < 6; col++)
            {
                float h = UnityEngine.Random.Range(buildingMinHeight, buildingMaxHeight);
                float w = UnityEngine.Random.Range(5f, 10f);

                // Add some variation by style
                if (style == ArchStyle.Greek) h = Mathf.Min(h, 6f); // Greek towns are lower
                if (style == ArchStyle.NorthAfrican) w = Mathf.Max(w, 7f); // Medina blocks are bigger

                float x = col * (blockSize + streetWidth);
                float z = row * (blockSize + streetWidth);

                var building = CreateBox(zone, $"Building_{row}_{col}",
                    new Vector3(x, h / 2f, z), new Vector3(w, h, blockSize), colors.wall);

                // Roof
                CreateBox(zone, $"Roof_{row}_{col}",
                    new Vector3(x, h + 0.25f, z),
                    new Vector3(w + 0.5f, 0.5f, blockSize + 0.5f), colors.roof);

                // Doors (dark rectangles on front face)
                CreateBox(zone, $"Door_{row}_{col}",
                    new Vector3(x, 1.2f, z - blockSize / 2f - 0.01f),
                    new Vector3(1.2f, 2.4f, 0.05f), new Color(0.25f, 0.15f, 0.1f));

                // Windows (on upper floors)
                if (h > 5f)
                {
                    CreateBox(zone, $"Window_{row}_{col}",
                        new Vector3(x - 1.5f, h * 0.6f, z - blockSize / 2f - 0.01f),
                        new Vector3(0.8f, 1f, 0.05f), GetWindowColor(style));
                    CreateBox(zone, $"Window2_{row}_{col}",
                        new Vector3(x + 1.5f, h * 0.6f, z - blockSize / 2f - 0.01f),
                        new Vector3(0.8f, 1f, 0.05f), GetWindowColor(style));
                }
            }

            // Place NPCs in streets
            if (row == 1)
            {
                AddNPCSpawnPoint(zone, "fisherman", origin + new Vector3(15f, 0, row * (blockSize + streetWidth) + streetWidth / 2f));
            }
            if (row == 2)
            {
                AddNPCSpawnPoint(zone, "artisan", origin + new Vector3(25f, 0, row * (blockSize + streetWidth) + streetWidth / 2f));
            }
        }

        // Street paving
        for (int row = 0; row < 4; row++)
        {
            CreateBox(zone, $"Street_{row}",
                new Vector3(30f, 0.02f, row * (blockSize + streetWidth) + blockSize + streetWidth / 2f),
                new Vector3(80f, 0.04f, streetWidth), new Color(0.55f, 0.5f, 0.45f));
        }
    }

    void GenerateLandmark(Vector3 origin, StyleColors colors, ArchStyle style, string cityName)
    {
        var zone = CreateZone("Landmark", origin);

        // Landmark varies by architectural style
        switch (style)
        {
            case ArchStyle.Greek:
                // Temple columns
                for (int i = 0; i < 6; i++)
                {
                    CreateCylinder(zone, $"Column_{i}", new Vector3(-10f + i * 4f, 4f, 0),
                        new Vector3(0.6f, 4f, 0.6f), new Color(0.9f, 0.88f, 0.82f));
                }
                // Pediment
                CreateBox(zone, "Pediment", new Vector3(0, 8.5f, 0),
                    new Vector3(25f, 0.5f, 8f), new Color(0.9f, 0.88f, 0.82f));
                break;

            case ArchStyle.Turkish:
                // Mosque dome
                CreateSphere(zone, "Dome", new Vector3(0, 8f, 0),
                    new Vector3(12f, 8f, 12f), new Color(0.6f, 0.6f, 0.55f));
                // Minaret
                CreateCylinder(zone, "Minaret", new Vector3(10f, 12f, 0),
                    new Vector3(1f, 12f, 1f), new Color(0.85f, 0.82f, 0.75f));
                CreateSphere(zone, "MinaretTop", new Vector3(10f, 24.5f, 0),
                    new Vector3(2f, 2f, 2f), new Color(0.85f, 0.82f, 0.75f));
                break;

            case ArchStyle.NorthAfrican:
                // Medina gate
                CreateBox(zone, "MedinaWall", new Vector3(0, 5f, 0),
                    new Vector3(30f, 10f, 2f), new Color(0.75f, 0.55f, 0.35f));
                // Gate arch (simplified)
                CreateBox(zone, "GateArch", new Vector3(0, 8f, 0),
                    new Vector3(5f, 4f, 3f), new Color(0.7f, 0.5f, 0.3f));
                break;

            case ArchStyle.Maltese:
                // Fortification walls
                CreateBox(zone, "Fortification", new Vector3(0, 6f, 0),
                    new Vector3(25f, 12f, 3f), new Color(0.75f, 0.7f, 0.55f));
                // Bastion
                CreateBox(zone, "Bastion", new Vector3(12f, 4f, 5f),
                    new Vector3(8f, 8f, 8f), new Color(0.72f, 0.67f, 0.52f));
                break;

            default:
                // Generic church/cathedral
                CreateBox(zone, "Church", new Vector3(0, 7f, 0),
                    new Vector3(10f, 14f, 20f), colors.wall);
                // Bell tower
                CreateBox(zone, "BellTower", new Vector3(-6f, 12f, 8f),
                    new Vector3(4f, 24f, 4f), colors.wall);
                break;
        }

        AddNPCSpawnPoint(zone, "guide", origin + new Vector3(5f, 0, 6f));
        AddNPCSpawnPoint(zone, "tour-guide", origin + new Vector3(-3f, 0, 4f));
    }

    void GenerateOfficialBuildings(Vector3 origin, StyleColors colors)
    {
        var zone = CreateZone("OfficialArea", origin);

        // Customs office
        CreateBox(zone, "CustomsOffice", new Vector3(0, 2f, 0),
            new Vector3(8f, 4f, 6f), new Color(0.7f, 0.7f, 0.65f));
        // Flag pole
        CreateCylinder(zone, "FlagPole", new Vector3(5f, 4f, 0),
            new Vector3(0.1f, 4f, 0.1f), Color.white);

        AddNPCSpawnPoint(zone, "customs-officer", origin + new Vector3(0, 0, 4f));
    }

    // ─── Helpers ──────────────────────────────────────────────

    GameObject CreateZone(string name, Vector3 position)
    {
        var zone = new GameObject(name);
        zone.transform.SetParent(_currentPort.transform, false);
        zone.transform.position = position;
        return zone;
    }

    GameObject CreateBox(GameObject parent, string name, Vector3 localPos, Vector3 scale, Color color)
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

    GameObject CreateCylinder(GameObject parent, string name, Vector3 localPos, Vector3 scale, Color color)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = name;
        go.transform.SetParent(parent.transform, false);
        go.transform.localPosition = localPos;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().material.color = color;
        go.isStatic = true;
        return go;
    }

    GameObject CreateSphere(GameObject parent, string name, Vector3 localPos, Vector3 scale, Color color)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = name;
        go.transform.SetParent(parent.transform, false);
        go.transform.localPosition = localPos;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().material.color = color;
        go.isStatic = true;
        return go;
    }

    void CreateGround(Vector3 center, Color color, float size)
    {
        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "PortGround";
        ground.transform.SetParent(_currentPort.transform, false);
        ground.transform.position = center + Vector3.up * 0.01f;
        ground.transform.localScale = new Vector3(size / 10f, 1, size / 10f);
        ground.GetComponent<Renderer>().material.color = color;
    }

    void AddNPCSpawnPoint(GameObject zone, string role, Vector3 worldPos)
    {
        var point = new GameObject($"NPCSpawn_{role}");
        point.transform.SetParent(zone.transform, false);
        point.transform.position = worldPos;
        point.tag = "Respawn"; // reuse Unity tag for spawn points
        _npcSpawnPoints.Add(point.transform);
    }

    // ─── Style Colors ─────────────────────────────────────────

    struct StyleColors
    {
        public Color wall, roof, ground, accent;
    }

    StyleColors GetStyleColors(ArchStyle style)
    {
        switch (style)
        {
            case ArchStyle.Spanish:
                return new StyleColors {
                    wall = new Color(0.95f, 0.92f, 0.85f), // White
                    roof = new Color(0.7f, 0.35f, 0.2f),   // Terracotta
                    ground = new Color(0.75f, 0.65f, 0.5f), // Sandy
                    accent = new Color(0.2f, 0.35f, 0.6f),  // Azulejo blue
                };
            case ArchStyle.French:
                return new StyleColors {
                    wall = new Color(0.85f, 0.82f, 0.75f), // Limestone
                    roof = new Color(0.3f, 0.3f, 0.35f),   // Slate grey
                    ground = new Color(0.65f, 0.6f, 0.55f), // Cobblestone
                    accent = new Color(0.3f, 0.45f, 0.65f), // Blue shutters
                };
            case ArchStyle.Italian:
                return new StyleColors {
                    wall = new Color(0.9f, 0.75f, 0.5f),   // Warm ochre
                    roof = new Color(0.7f, 0.35f, 0.2f),   // Terracotta
                    ground = new Color(0.6f, 0.55f, 0.45f), // Stone
                    accent = new Color(0.5f, 0.2f, 0.15f),  // Dark red
                };
            case ArchStyle.Greek:
                return new StyleColors {
                    wall = new Color(0.95f, 0.95f, 0.98f), // Brilliant white
                    roof = new Color(0.2f, 0.4f, 0.7f),    // Blue dome
                    ground = new Color(0.8f, 0.78f, 0.72f), // Light stone
                    accent = new Color(0.15f, 0.35f, 0.65f), // Deep blue
                };
            case ArchStyle.Turkish:
                return new StyleColors {
                    wall = new Color(0.8f, 0.75f, 0.65f),  // Sandstone
                    roof = new Color(0.5f, 0.5f, 0.45f),   // Lead grey
                    ground = new Color(0.6f, 0.55f, 0.45f), // Cobblestone
                    accent = new Color(0.1f, 0.35f, 0.45f), // Teal
                };
            case ArchStyle.NorthAfrican:
                return new StyleColors {
                    wall = new Color(0.82f, 0.6f, 0.38f),  // Rammed earth
                    roof = new Color(0.75f, 0.55f, 0.32f),  // Flat roof clay
                    ground = new Color(0.7f, 0.6f, 0.45f),  // Dusty
                    accent = new Color(0.15f, 0.4f, 0.25f),  // Green tile
                };
            case ArchStyle.Croatian:
                return new StyleColors {
                    wall = new Color(0.8f, 0.78f, 0.7f),   // White stone
                    roof = new Color(0.7f, 0.32f, 0.18f),   // Red tile
                    ground = new Color(0.65f, 0.62f, 0.55f), // Limestone
                    accent = new Color(0.55f, 0.25f, 0.15f), // Deep red
                };
            case ArchStyle.Maltese:
                return new StyleColors {
                    wall = new Color(0.82f, 0.75f, 0.58f),  // Globigerina limestone
                    roof = new Color(0.75f, 0.68f, 0.52f),  // Flat limestone roof
                    ground = new Color(0.7f, 0.65f, 0.5f),  // Honey stone
                    accent = new Color(0.2f, 0.4f, 0.3f),   // Green balcony
                };
            default:
                return new StyleColors {
                    wall = new Color(0.8f, 0.78f, 0.72f),
                    roof = new Color(0.6f, 0.35f, 0.25f),
                    ground = new Color(0.65f, 0.6f, 0.5f),
                    accent = new Color(0.4f, 0.3f, 0.25f),
                };
        }
    }

    Color GetWindowColor(ArchStyle style)
    {
        switch (style)
        {
            case ArchStyle.French: return new Color(0.3f, 0.45f, 0.65f); // Blue shutters
            case ArchStyle.Greek: return new Color(0.2f, 0.4f, 0.7f);    // Blue
            case ArchStyle.Turkish: return new Color(0.1f, 0.35f, 0.45f); // Teal
            case ArchStyle.Maltese: return new Color(0.2f, 0.4f, 0.3f);  // Green
            default: return new Color(0.2f, 0.2f, 0.25f); // Dark
        }
    }

    Color GetAwningColor(int index)
    {
        Color[] awnings = {
            new Color(0.8f, 0.2f, 0.15f),  // Red
            new Color(0.1f, 0.35f, 0.55f),  // Blue
            new Color(0.7f, 0.5f, 0.15f),   // Gold
            new Color(0.15f, 0.45f, 0.2f),  // Green
            new Color(0.6f, 0.3f, 0.1f),    // Brown
        };
        return awnings[index % awnings.Length];
    }
}
