/*
 * PortScenarioLoader.cs — Loads detailed per-port scenario scripts.
 *
 * Reads from schemas/ports/ which contain rich scenario data for
 * major ports (Barcelona, Istanbul, Naples, etc.). Each file defines
 * scenario chains, customs dialogues, provisioning scenes, and
 * port-specific interactions.
 *
 * This bridges the gap between the port *registry* (who/where) and
 * the port *scenarios* (what happens). The two systems work together:
 *
 *   PortRegistryLoader → WHO is there and WHERE they are
 *   PortScenarioLoader → WHAT HAPPENS when you interact
 *
 * If a port has no scenario file, a default chain is generated.
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;

[Serializable]
public class ScenarioPhase
{
    public string id;
    public string name;
    public string description;
    public string npcRole;
    public string location;
    public bool required = true;
    public List<string> dialogueHints = new List<string>();
    public List<string> vocabularyTargets = new List<string>();
}

[Serializable]
public class PortScenario
{
    public string portId;
    public string portName;
    public string country;
    public string language;
    public string difficulty;
    public List<ScenarioPhase> phases = new List<ScenarioPhase>();
    public Dictionary<string, string> culturalNotes = new Dictionary<string, string>();
}

/// <summary>
/// Loads and manages per-port scenario scripts from YAML files.
/// Works alongside PortRegistryLoader — registry provides the cast,
/// scenarios provide the script.
/// </summary>
public class PortScenarioLoader : MonoBehaviour
{
    public static PortScenarioLoader Instance { get; private set; }

    private Dictionary<string, PortScenario> _scenarios = new Dictionary<string, PortScenario>();
    private PortScenario _defaultScenario;

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        LoadAllScenarios();
        BuildDefaultScenario();
        Debug.Log($"[ScenarioLoader] ✅ Loaded {_scenarios.Count} port scenarios + default template");
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Get the scenario for a specific port. Falls back to default if none exists.
    /// </summary>
    public PortScenario GetScenario(string portId, string portName = "", string country = "")
    {
        // Try exact match
        if (_scenarios.TryGetValue(portId, out var exact)) return exact;

        // Try by name (lowercase)
        string nameKey = portName.ToLower().Replace(" ", "-");
        if (_scenarios.TryGetValue(nameKey, out var byName)) return byName;

        // Try partial match
        foreach (var kvp in _scenarios)
        {
            if (portId.Contains(kvp.Key) || kvp.Key.Contains(portId))
                return kvp.Value;
        }

        // Return default scenario customized for this port
        var fallback = CloneScenario(_defaultScenario);
        fallback.portId = portId;
        fallback.portName = portName;
        fallback.country = country;
        return fallback;
    }

    /// <summary>
    /// Check if a port has a detailed scenario (vs using default).
    /// </summary>
    public bool HasDetailedScenario(string portId)
    {
        return _scenarios.ContainsKey(portId);
    }

    /// <summary>
    /// Get all available scenario port IDs.
    /// </summary>
    public List<string> GetAvailableScenarioPorts()
    {
        return new List<string>(_scenarios.Keys);
    }

    // ─── Loading ──────────────────────────────────────────────

    void LoadAllScenarios()
    {
        string scenarioDir = Path.Combine(Application.streamingAssetsPath, "ports");
        if (!Directory.Exists(scenarioDir))
        {
            Debug.Log("[ScenarioLoader] No ports/ directory found — using defaults only");
            return;
        }

        string[] files = Directory.GetFiles(scenarioDir, "*.yaml");
        foreach (string file in files)
        {
            try
            {
                string yaml = File.ReadAllText(file);
                PortScenario scenario = ParseScenarioYAML(yaml, Path.GetFileNameWithoutExtension(file));
                if (scenario != null)
                {
                    _scenarios[scenario.portId] = scenario;
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[ScenarioLoader] Failed to load {file}: {e.Message}");
            }
        }
    }

    PortScenario ParseScenarioYAML(string yaml, string filename)
    {
        var scenario = new PortScenario { portId = filename };
        ScenarioPhase currentPhase = null;
        bool inVocab = false;
        bool inDialogue = false;

        foreach (string rawLine in yaml.Split('\n'))
        {
            string line = rawLine.TrimEnd('\r');
            string trimmed = line.TrimStart();

            // Port name from comment
            var nameMatch = Regex.Match(trimmed, @"^# Port Scenario:\s*(.+)");
            if (nameMatch.Success)
            {
                scenario.portName = nameMatch.Groups[1].Value.Trim();
                continue;
            }

            // Port ID
            if (trimmed.StartsWith("port_id:"))
                scenario.portId = trimmed.Substring("port_id:".Length).Trim();
            else if (trimmed.StartsWith("country:"))
                scenario.country = trimmed.Substring("country:".Length).Trim();
            else if (trimmed.StartsWith("language:"))
                scenario.language = trimmed.Substring("language:".Length).Trim();

            // Phase headers
            var phaseMatch = Regex.Match(line, @"^\s{2}- id:\s*(.+)");
            if (phaseMatch.Success)
            {
                currentPhase = new ScenarioPhase { id = phaseMatch.Groups[1].Value.Trim() };
                scenario.phases.Add(currentPhase);
                inVocab = false;
                inDialogue = false;
                continue;
            }

            if (currentPhase != null)
            {
                if (trimmed.StartsWith("name:"))
                    currentPhase.name = trimmed.Substring("name:".Length).Trim().Trim('"');
                else if (trimmed.StartsWith("description:"))
                    currentPhase.description = trimmed.Substring("description:".Length).Trim().Trim('"');
                else if (trimmed.StartsWith("npc_role:"))
                    currentPhase.npcRole = trimmed.Substring("npc_role:".Length).Trim();
                else if (trimmed.StartsWith("location:"))
                    currentPhase.location = trimmed.Substring("location:".Length).Trim().Trim('"');
                else if (trimmed.StartsWith("required:"))
                    currentPhase.required = trimmed.Contains("true");
                else if (trimmed.StartsWith("vocabulary_targets:"))
                    { inVocab = true; inDialogue = false; }
                else if (trimmed.StartsWith("dialogue_hints:"))
                    { inDialogue = true; inVocab = false; }
                else if (trimmed.StartsWith("- ") && inVocab)
                    currentPhase.vocabularyTargets.Add(trimmed.Substring(2).Trim().Trim('"'));
                else if (trimmed.StartsWith("- ") && inDialogue)
                    currentPhase.dialogueHints.Add(trimmed.Substring(2).Trim().Trim('"'));
            }
        }

        return scenario.phases.Count > 0 ? scenario : null;
    }

    void BuildDefaultScenario()
    {
        _defaultScenario = new PortScenario
        {
            portId = "default",
            portName = "Unknown Port",
            phases = new List<ScenarioPhase>
            {
                new ScenarioPhase {
                    id = "vhf_call", name = "VHF Radio Call",
                    description = "Contact port control on VHF Ch16, request docking permission",
                    npcRole = "harbor-master", required = true
                },
                new ScenarioPhase {
                    id = "docking", name = "Harbor Approach",
                    description = "Navigate to assigned berth, interact with marina staff",
                    npcRole = "marina-attendant", required = true
                },
                new ScenarioPhase {
                    id = "immigration", name = "Immigration & Customs",
                    description = "Present passport and crew list to immigration officer",
                    npcRole = "immigration-officer", required = true
                },
                new ScenarioPhase {
                    id = "provisioning", name = "Provisioning",
                    description = "Buy fuel, water, groceries for the next leg",
                    npcRole = "grocer", required = false
                },
                new ScenarioPhase {
                    id = "explore", name = "Explore the Port",
                    description = "Visit landmarks, talk to locals, practice the language",
                    npcRole = "tourist-guide", required = false
                },
                new ScenarioPhase {
                    id = "departure", name = "Departure Clearance",
                    description = "Get departure papers, check weather, plan next route",
                    npcRole = "harbor-master", required = true
                }
            }
        };
    }

    PortScenario CloneScenario(PortScenario source)
    {
        var clone = new PortScenario
        {
            portId = source.portId,
            portName = source.portName,
            country = source.country,
            language = source.language,
            phases = new List<ScenarioPhase>()
        };
        foreach (var p in source.phases)
        {
            clone.phases.Add(new ScenarioPhase
            {
                id = p.id, name = p.name, description = p.description,
                npcRole = p.npcRole, location = p.location, required = p.required,
                dialogueHints = new List<string>(p.dialogueHints),
                vocabularyTargets = new List<string>(p.vocabularyTargets)
            });
        }
        return clone;
    }
}
