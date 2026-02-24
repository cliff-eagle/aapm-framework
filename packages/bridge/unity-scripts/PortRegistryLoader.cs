/*
 * PortRegistryLoader.cs — Loads port YAML registry into runtime data.
 *
 * SETUP:
 *   1. Attach to a persistent GameObject
 *   2. Place port YAML files in StreamingAssets/ports-registry/
 *   3. Loads all ports on Start() and registers with SeaNavigator
 *
 * This converts YAML registry data into C# classes
 * that NPCSpawner and ChartTableUI consume at runtime.
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;

/// <summary>
/// Runtime port data loaded from the YAML registry files.
/// </summary>
[Serializable]
public class PortData
{
    public string id;
    public string name;
    public string country;
    public float latitude;
    public float longitude;
    public string marina;
    public string culturalHighlight;
    public List<string> languages = new List<string>();
    public List<NPCData> npcs = new List<NPCData>();

    // Optional
    public string crewSpecialCrew;
    public string crewSpecialNote;
}

[Serializable]
public class NPCData
{
    public string name;
    public string role;
    public string language;
    public string personality;
    public string culturalNote;
}

/// <summary>
/// Loads port YAML files and provides runtime access to all 158 ports.
/// Uses simple regex-based YAML parsing (no external dependency).
/// </summary>
public class PortRegistryLoader : MonoBehaviour
{
    [Header("Settings")]
    public string registryFolder = "ports-registry";

    // ─── Registry ─────────────────────────────────────────────

    public static PortRegistryLoader Instance { get; private set; }

    private readonly List<PortData> _allPorts = new List<PortData>();
    private readonly Dictionary<string, PortData> _portById = new Dictionary<string, PortData>();
    private readonly Dictionary<string, List<PortData>> _portsByCountry = new Dictionary<string, List<PortData>>();

    /// <summary>All loaded ports</summary>
    public IReadOnlyList<PortData> AllPorts => _allPorts;

    /// <summary>Total port count</summary>
    public int PortCount => _allPorts.Count;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        LoadAllRegistryFiles();
        RegisterWithNavigator();
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>Get a port by its ID (e.g., "loc_barcelona")</summary>
    public PortData GetPort(string id)
    {
        _portById.TryGetValue(id, out var port);
        return port;
    }

    /// <summary>Get all ports for a country</summary>
    public List<PortData> GetPortsByCountry(string country)
    {
        _portsByCountry.TryGetValue(country, out var ports);
        return ports ?? new List<PortData>();
    }

    /// <summary>Find nearest port to a GPS position</summary>
    public PortData FindNearestPort(float lat, float lon)
    {
        PortData nearest = null;
        float minDist = float.MaxValue;

        foreach (var port in _allPorts)
        {
            float d = Mathf.Sqrt(
                Mathf.Pow(port.latitude - lat, 2) +
                Mathf.Pow(port.longitude - lon, 2)
            );
            if (d < minDist)
            {
                minDist = d;
                nearest = port;
            }
        }
        return nearest;
    }

    /// <summary>Find all ports within a radius (degrees)</summary>
    public List<PortData> FindPortsInRadius(float lat, float lon, float radiusDegrees)
    {
        var result = new List<PortData>();
        foreach (var port in _allPorts)
        {
            float d = Mathf.Sqrt(
                Mathf.Pow(port.latitude - lat, 2) +
                Mathf.Pow(port.longitude - lon, 2)
            );
            if (d <= radiusDegrees) result.Add(port);
        }
        return result;
    }

    // ─── Loading ──────────────────────────────────────────────

    void LoadAllRegistryFiles()
    {
        string path = Path.Combine(Application.streamingAssetsPath, registryFolder);

        if (!Directory.Exists(path))
        {
            Debug.LogWarning($"[Registry] ⚠️ Port registry folder not found: {path}");
            Debug.Log("[Registry] Using built-in port data instead");
            LoadBuiltInPorts();
            return;
        }

        string[] files = Directory.GetFiles(path, "*.yaml");
        foreach (string file in files)
        {
            try
            {
                string yaml = File.ReadAllText(file);
                var ports = ParseYAML(yaml);
                foreach (var port in ports)
                {
                    _allPorts.Add(port);
                    _portById[port.id] = port;

                    if (!_portsByCountry.ContainsKey(port.country))
                        _portsByCountry[port.country] = new List<PortData>();
                    _portsByCountry[port.country].Add(port);
                }
                Debug.Log($"[Registry] ✅ Loaded {ports.Count} ports from {Path.GetFileName(file)}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Registry] ❌ Failed to load {file}: {ex.Message}");
            }
        }

        Debug.Log($"[Registry] 📍 Total: {_allPorts.Count} ports loaded from {files.Length} files");
    }

    void RegisterWithNavigator()
    {
        var nav = SeaNavigator.Instance;
        if (nav == null) return;

        foreach (var port in _allPorts)
        {
            nav.RegisterPort(port.id, port.latitude, port.longitude);
        }
    }

    // ─── Simple YAML Parser ───────────────────────────────────
    // Lightweight regex parser for our specific YAML structure.
    // For production, consider YamlDotNet.

    List<PortData> ParseYAML(string yaml)
    {
        var ports = new List<PortData>();
        PortData current = null;

        string[] lines = yaml.Split('\n');
        bool inNPCs = false;

        foreach (string rawLine in lines)
        {
            string line = rawLine.TrimEnd('\r');

            // New port entry
            if (line.TrimStart().StartsWith("- id:"))
            {
                current = new PortData();
                current.id = ExtractValue(line, "id");
                ports.Add(current);
                inNPCs = false;
                continue;
            }

            if (current == null) continue;

            // Port fields
            if (line.Contains("name:") && !line.Contains("npcs") && !inNPCs && !line.TrimStart().StartsWith("-"))
            {
                current.name = ExtractValue(line, "name");
            }
            else if (line.Contains("country:") && !inNPCs)
            {
                current.country = ExtractValue(line, "country");
            }
            else if (line.Contains("coordinates:"))
            {
                var match = Regex.Match(line, @"\[(\-?[\d.]+),\s*(\-?[\d.]+)\]");
                if (match.Success)
                {
                    float.TryParse(match.Groups[1].Value, out current.latitude);
                    float.TryParse(match.Groups[2].Value, out current.longitude);
                }
            }
            else if (line.Contains("marina:") && !inNPCs)
            {
                current.marina = ExtractValue(line, "marina");
            }
            else if (line.Contains("cultural_highlight:"))
            {
                current.culturalHighlight = ExtractQuotedValue(line);
            }
            else if (line.Contains("languages:"))
            {
                var match = Regex.Match(line, @"\[(.*?)\]");
                if (match.Success)
                {
                    string[] langs = match.Groups[1].Value.Split(',');
                    foreach (var lang in langs)
                        current.languages.Add(lang.Trim());
                }
            }
            else if (line.TrimStart().StartsWith("npcs:"))
            {
                inNPCs = true;
            }
            else if (inNPCs && line.TrimStart().StartsWith("- {"))
            {
                var npc = ParseNPC(line);
                if (npc != null) current.npcs.Add(npc);
            }
            else if (inNPCs && !line.TrimStart().StartsWith("-") && !line.TrimStart().StartsWith("#") && line.Trim().Length > 0 && !line.Contains("  "))
            {
                inNPCs = false; // exited NPCs block
            }
        }

        return ports;
    }

    NPCData ParseNPC(string line)
    {
        var npc = new NPCData();
        npc.name = ExtractBraceValue(line, "name");
        npc.role = ExtractBraceValue(line, "role");
        npc.language = ExtractBraceValue(line, "language");
        npc.personality = ExtractBraceValue(line, "personality");
        npc.culturalNote = ExtractBraceValue(line, "cultural_note");
        return string.IsNullOrEmpty(npc.name) ? null : npc;
    }

    string ExtractValue(string line, string key)
    {
        var match = Regex.Match(line, key + @":\s*(.+)");
        return match.Success ? match.Groups[1].Value.Trim().Trim('"') : "";
    }

    string ExtractQuotedValue(string line)
    {
        var match = Regex.Match(line, @"""(.+?)""");
        return match.Success ? match.Groups[1].Value : "";
    }

    string ExtractBraceValue(string line, string key)
    {
        var match = Regex.Match(line, key + @":\s*(.+?)(?:,\s*\w+:|})");
        if (match.Success)
        {
            return match.Groups[1].Value.Trim().Trim('"');
        }
        // Fallback for last field before closing brace
        match = Regex.Match(line, key + @":\s*""(.+?)""");
        return match.Success ? match.Groups[1].Value : "";
    }

    // ─── Built-in Ports (fallback) ────────────────────────────

    void LoadBuiltInPorts()
    {
        // Core ports hard-coded as fallback when YAML files aren't in StreamingAssets
        AddBuiltIn("loc_barcelona", "Barcelona", "Spain", 41.38f, 2.18f, "Port Olímpic");
        AddBuiltIn("loc_valencia", "Valencia", "Spain", 39.47f, -0.38f, "Marina de Valencia");
        AddBuiltIn("loc_ibiza", "Ibiza", "Spain", 38.91f, 1.44f, "Marina Ibiza");
        AddBuiltIn("loc_palma", "Palma de Mallorca", "Spain", 39.57f, 2.65f, "Club de Mar");
        AddBuiltIn("loc_malaga", "Málaga", "Spain", 36.72f, -4.42f, "Puerto de Málaga");
        AddBuiltIn("loc_nice", "Nice", "France", 43.70f, 7.27f, "Port de Nice");
        AddBuiltIn("loc_monaco", "Monte Carlo", "Monaco", 43.74f, 7.43f, "Port Hercules");
        AddBuiltIn("loc_marseille", "Marseille", "France", 43.30f, 5.37f, "Vieux-Port");
        AddBuiltIn("loc_st_tropez", "Saint-Tropez", "France", 43.27f, 6.64f, "Vieux Port");
        AddBuiltIn("loc_cannes", "Cannes", "France", 43.55f, 7.02f, "Vieux Port");
        AddBuiltIn("loc_naples", "Naples", "Italy", 40.85f, 14.27f, "Marina di Napoli");
        AddBuiltIn("loc_amalfi", "Amalfi", "Italy", 40.63f, 14.60f, "Porto di Amalfi");
        AddBuiltIn("loc_capri", "Capri", "Italy", 40.55f, 14.24f, "Marina Grande");
        AddBuiltIn("loc_portofino", "Portofino", "Italy", 44.30f, 9.21f, "Porto di Portofino");
        AddBuiltIn("loc_venice", "Venice", "Italy", 45.44f, 12.32f, "Marina Sant'Elena");
        AddBuiltIn("loc_palermo", "Palermo", "Italy", 38.12f, 13.36f, "La Cala Marina");
        AddBuiltIn("loc_athens", "Athens (Piraeus)", "Greece", 37.94f, 23.65f, "Zea Marina");
        AddBuiltIn("loc_santorini", "Santorini", "Greece", 36.43f, 25.43f, "Vlychada Marina");
        AddBuiltIn("loc_mykonos", "Mykonos", "Greece", 37.45f, 25.33f, "New Port");
        AddBuiltIn("loc_rhodes", "Rhodes", "Greece", 36.45f, 28.22f, "Mandraki Harbor");
        AddBuiltIn("loc_corfu", "Corfu", "Greece", 39.62f, 19.92f, "Gouvia Marina");
        AddBuiltIn("loc_istanbul", "Istanbul", "Turkey", 41.01f, 28.98f, "Kalamış Marina");
        AddBuiltIn("loc_bodrum", "Bodrum", "Turkey", 37.03f, 27.43f, "Milta Bodrum Marina");
        AddBuiltIn("loc_antalya", "Antalya", "Turkey", 36.88f, 30.70f, "Kaleiçi Marina");
        AddBuiltIn("loc_dubrovnik", "Dubrovnik", "Croatia", 42.65f, 18.09f, "ACI Marina");
        AddBuiltIn("loc_split", "Split", "Croatia", 43.51f, 16.44f, "ACI Marina Split");
        AddBuiltIn("loc_hvar", "Hvar", "Croatia", 43.17f, 16.44f, "Hvar Marina");
        AddBuiltIn("loc_kotor", "Kotor", "Montenegro", 42.42f, 18.77f, "Marina Kotor");
        AddBuiltIn("loc_valletta", "Valletta", "Malta", 35.90f, 14.51f, "Grand Harbour Marina");
        AddBuiltIn("loc_marsaxlokk", "Marsaxlokk", "Malta", 35.84f, 14.54f, "Marsaxlokk Harbor");
        AddBuiltIn("loc_gozo", "Mġarr (Gozo)", "Malta", 36.03f, 14.30f, "Mġarr Harbour");
        AddBuiltIn("loc_tel_aviv", "Tel Aviv / Jaffa", "Israel", 32.05f, 34.75f, "Tel Aviv Marina");
        AddBuiltIn("loc_beirut", "Beirut", "Lebanon", 33.89f, 35.50f, "Zaitunay Bay Marina");
        AddBuiltIn("loc_alexandria", "Alexandria", "Egypt", 31.20f, 29.92f, "El-Montazah Marina");
        AddBuiltIn("loc_tangier", "Tangier", "Morocco", 35.78f, -5.81f, "Tanja Marina Bay");
        AddBuiltIn("loc_tunis", "Tunis / La Goulette", "Tunisia", 36.81f, 10.18f, "Port de La Goulette");
        AddBuiltIn("loc_algiers", "Algiers", "Algeria", 36.75f, 3.04f, "Port d'Alger");

        Debug.Log($"[Registry] 📍 Loaded {_allPorts.Count} built-in ports (YAML files not found)");
    }

    void AddBuiltIn(string id, string name, string country, float lat, float lon, string marina)
    {
        var port = new PortData
        {
            id = id, name = name, country = country,
            latitude = lat, longitude = lon, marina = marina
        };
        _allPorts.Add(port);
        _portById[id] = port;

        if (!_portsByCountry.ContainsKey(country))
            _portsByCountry[country] = new List<PortData>();
        _portsByCountry[country].Add(port);
    }
}
