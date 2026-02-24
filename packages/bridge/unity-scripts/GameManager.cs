/*
 * GameManager.cs — Master game orchestrator for Cielos del Mediterráneo.
 *
 * SETUP:
 *   1. Create an empty GameObject named "GameManager"
 *   2. Attach this script
 *   3. Set API key on the OnboardingUI (runtime) or Inspector (dev)
 *   4. This object persists across scene loads
 *
 * FLOW:
 *   Onboarding → API Key Entry → Session Init → Sailing →
 *   Port Approach (VHF) → Docking (generates port + services + NPCs) →
 *   Exploration → Departure → Next Port
 *
 * SYSTEMS MANAGED:
 *   - AAPMBridge (WebSocket to TypeScript brain)
 *   - SeaNavigator (GPS, navigation HUD)
 *   - YachtController (sailing physics)
 *   - YachtInterior (below-deck rooms)
 *   - WeatherSystem (day/night, wind, sea state)
 *   - PortRegistryLoader (YAML port data)
 *   - RealisticPortGenerator (landmark-based port layout)
 *   - PortServicesGenerator (universal service buildings)
 *   - NPCSpawner (populate port with NPCs)
 *   - ProgressionManager (track visits, crew bonds)
 *
 * AGENTS MANAGED:
 *   - NavigationAgent (route planning, approach coaching, VHF triggers)
 *   - CrewAgent (proactive crew conversations, cultural briefings)
 *   - ScenarioDirector (phase sequencing, time pressure, events)
 *   - ProgressionAgent (skill tracking, achievements, difficulty)
 *   - WeatherDirector (weather-gated language scenarios)
 */

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public enum GameState
{
    Onboarding,       // Language/difficulty selection + API key
    Sailing,          // Between ports — crew conversations
    PortApproach,     // VHF radio call phase
    Docking,          // Generating port environment
    Docked,           // Harbor master, customs, exploration
    Departure,        // Requesting permission to leave
    Summary           // Port visit summary
}

/// <summary>
/// Singleton game orchestrator. Controls game phase transitions,
/// session management, and coordinates ALL other managers.
/// </summary>
public class GameManager : MonoBehaviour
{
    [Header("Game Configuration")]
    public string defaultSchemaId = "yacht-captain-mediterranean";
    public string defaultLearnerId = "captain-1";

    [Header("Player Settings (set via Onboarding UI)")]
    public string nativeLanguage = "English";
    public string targetLanguage = "Spanish";
    public string cefrLevel = "A2";
    public string difficulty = "traveler";

    [Header("API Configuration")]
    [Tooltip("Set at runtime via onboarding UI")]
    public string apiKey = "";

    // ─── Singleton ────────────────────────────────────────────

    public static GameManager Instance { get; private set; }

    // ─── State ────────────────────────────────────────────────

    public GameState CurrentState { get; private set; } = GameState.Onboarding;
    public string CurrentCity { get; private set; }
    public string CurrentLocationId { get; private set; }
    public string CurrentCountry { get; private set; }
    public int PortsVisited { get; private set; } = 0;
    public bool IsExploringPort { get; private set; } = false;

    // ─── Events ───────────────────────────────────────────────

    public event Action<GameState> OnGameStateChanged;
    public event Action<string> OnCityChanged;
    public event Action<string, string> OnScenarioStepChanged; // (stepId, stepName)

    // ─── Cached references ────────────────────────────────────

    private List<Transform> _allNPCSpawnPoints = new List<Transform>();

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
        // Listen for bridge messages
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived += HandleBridgeMessage;
            AAPMBridge.Instance.OnConnectionChanged += OnBridgeConnectionChanged;
        }

        // Subscribe to agent decisions
        SubscribeToAgents();

        // Ensure all systems are present
        ValidateSystems();
    }

    void OnDestroy()
    {
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived -= HandleBridgeMessage;
            AAPMBridge.Instance.OnConnectionChanged -= OnBridgeConnectionChanged;
        }
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Called by OnboardingUI when player finishes setup.
    /// </summary>
    public void CompleteOnboarding(string nativeLang, string targetLang, string level, string diff, string key)
    {
        nativeLanguage = nativeLang;
        targetLanguage = targetLang;
        cefrLevel = level;
        difficulty = diff;
        apiKey = key;

        Debug.Log($"[GameManager] Onboarding complete: {targetLang} at {level}, difficulty={diff}");

        // Start session with the bridge server
        AAPMBridge.Instance?.InitSession(
            defaultSchemaId,
            defaultLearnerId,
            nativeLanguage,
            targetLanguage,
            cefrLevel
        );

        SetState(GameState.Sailing);
    }

    /// <summary>
    /// Navigate to a new port city. Called from chart table / map UI.
    /// </summary>
    public void SailToPort(string cityName, string locationId)
    {
        CurrentCity = cityName;
        CurrentLocationId = locationId;
        OnCityChanged?.Invoke(cityName);

        Debug.Log($"[GameManager] ⛵ Setting course for {cityName} ({locationId})");

        // Navigate via bridge
        AAPMBridge.Instance?.Navigate(locationId);

        // Set destination on SeaNavigator
        Vector3 portPos = Vector3.zero;
        if (SeaNavigator.Instance != null)
        {
            portPos = SeaNavigator.Instance.GetPortWorldPosition(locationId);
            var (lat, lon) = SeaNavigator.Instance.WorldToGPS(portPos);
            SeaNavigator.Instance.SetDestination(cityName, lat, lon);
        }

        // ─── NavigationAgent: set destination for approach detection ──
        NavigationAgent.Instance?.SetDestination(locationId, cityName, portPos);

        SetState(GameState.Sailing);
    }

    /// <summary>
    /// Called when the yacht arrives near a port (distance check or VHF complete).
    /// Triggers port generation and NPC spawning.
    /// </summary>
    public void ArriveAtPort()
    {
        if (CurrentState == GameState.Docked || CurrentState == GameState.Docking) return;

        Debug.Log($"[GameManager] 🏗️ Arriving at {CurrentCity} — generating port...");
        SetState(GameState.Docking);

        // Look up port data
        PortData portData = PortRegistryLoader.Instance?.GetPortById(CurrentLocationId);
        if (portData == null)
        {
            Debug.LogWarning($"[GameManager] No port data for {CurrentLocationId} — using fallback");
            portData = new PortData { id = CurrentLocationId, name = CurrentCity, country = "Unknown" };
        }

        CurrentCountry = portData.country;

        // Get port world position
        Vector3 portCenter = Vector3.zero;
        if (SeaNavigator.Instance != null)
        {
            portCenter = SeaNavigator.Instance.GetPortWorldPosition(CurrentLocationId);
        }

        _allNPCSpawnPoints.Clear();

        // ─── 1. Generate port environment (landmarks) ─────────
        if (RealisticPortGenerator.Instance != null)
        {
            var landmarkSpawns = RealisticPortGenerator.Instance.GeneratePort(portData, portCenter);
            _allNPCSpawnPoints.AddRange(landmarkSpawns);
            Debug.Log($"[GameManager] 🏛️ Generated {landmarkSpawns.Count} landmark NPC positions");
        }
        else if (PortEnvironmentGenerator.Instance != null)
        {
            // Fallback to generic port generator
            var genericSpawns = PortEnvironmentGenerator.Instance.GeneratePort(
                portData.name, portData.country, portCenter
            );
            _allNPCSpawnPoints.AddRange(genericSpawns);
        }

        // ─── 2. Generate universal service buildings ──────────
        if (PortServicesGenerator.Instance != null)
        {
            var serviceSpawns = PortServicesGenerator.Instance.GenerateServices(
                portData.country, portCenter
            );
            _allNPCSpawnPoints.AddRange(serviceSpawns);
            Debug.Log($"[GameManager] 🏢 Generated {serviceSpawns.Count} service NPC positions");
        }

        // ─── 3. Spawn NPCs at their positions ────────────────
        if (NPCSpawner.Instance != null && portData.npcs != null)
        {
            NPCSpawner.Instance.SpawnPortNPCs(portData, _allNPCSpawnPoints);
            Debug.Log($"[GameManager] 👥 Spawned {portData.npcs.Count} NPCs");
        }

        // ─── 4. Disable yacht interior during port walk ──────
        if (YachtInterior.Instance != null && YachtInterior.Instance.IsPlayerBelowDeck)
        {
            YachtInterior.Instance.ToggleBelowDeck(); // Force topside
        }

        // ─── 5. Anchor the yacht ─────────────────────────────
        if (YachtController.Instance != null)
        {
            YachtController.Instance.DropAnchor();
        }

        // ─── 6. Start the scenario chain ─────────────────────
        AAPMBridge.Instance?.StartScenario(CurrentCity, CurrentLocationId);

        // ─── 7. ScenarioDirector: sequence port phases ───────
        ScenarioDirector.Instance?.StartScenario(
            CurrentLocationId, portData.name, portData.country
        );

        // ─── 8. NavigationAgent: clear destination (we've arrived) ──
        NavigationAgent.Instance?.ClearDestination();

        // ─── 9. Transition to Docked ─────────────────────────
        IsExploringPort = true;
        SetState(GameState.Docked);

        // ─── 10. Record visit in both progression systems ────
        ProgressionManager.Instance?.RecordPortVisit(
            CurrentCity, CurrentLocationId, CurrentCountry
        );
        ProgressionAgent.Instance?.RecordPortVisit(
            CurrentCity, CurrentLocationId, CurrentCountry
        );

        Debug.Log($"[GameManager] ✅ {CurrentCity} ready — {_allNPCSpawnPoints.Count} total NPC positions");
    }

    /// <summary>
    /// Advance to the next scenario step.
    /// </summary>
    public void AdvanceScenario(bool skipOptional = false)
    {
        AAPMBridge.Instance?.AdvanceScenario(skipOptional);
    }

    /// <summary>
    /// Mark port visit complete and return to sailing.
    /// </summary>
    public void DepartPort()
    {
        // ─── Check departure gate ─────────────────────────────
        if (ScenarioDirector.Instance != null && !ScenarioDirector.Instance.CanDepart())
        {
            Debug.Log($"[GameManager] 🚫 Cannot depart — required phases incomplete");
            return;
        }

        Debug.Log($"[GameManager] ⚓ Departing {CurrentCity}...");

        PortsVisited++;
        IsExploringPort = false;

        // ─── ScenarioDirector: end scenario + get stats ──────
        ScenarioDirector.Instance?.EndScenario();

        // ─── ProgressionAgent: record completion ─────────────
        var phases = ScenarioDirector.Instance?.GetPhaseStatusList();
        int phasesCompleted = phases?.Count(p => p.state == ScenarioDirector.PhaseState.Completed) ?? 0;
        int totalPhases = phases?.Count ?? 0;
        ProgressionAgent.Instance?.RecordScenarioCompletion(
            CurrentLocationId, CurrentCity, CurrentCountry,
            phasesCompleted, totalPhases, 0.7f, 0.6f, 0 // defaults; real metrics from bridge
        );

        // ─── Clean up port environment ───────────────────────
        RealisticPortGenerator.Instance?.ClearPort();
        PortServicesGenerator.Instance?.ClearServices();
        NPCSpawner.Instance?.ClearNPCs();
        _allNPCSpawnPoints.Clear();

        // ─── Weigh anchor ────────────────────────────────────
        if (YachtController.Instance != null)
        {
            YachtController.Instance.WeighAnchor();
        }

        SetState(GameState.Summary);

        // Get weather description for departure log
        string weather = WeatherSystem.Instance?.GetWeatherDescription() ?? "Fair weather";
        Debug.Log($"[GameManager] Departed {CurrentCity}. Weather: {weather}. Ports visited: {PortsVisited}");

        // After summary, go back to sailing
        StartCoroutine(ReturnToSailing(5f));
    }

    /// <summary>
    /// Quick travel to a port — skips sailing, goes straight to docking.
    /// </summary>
    public void QuickTravel(string cityName, string locationId)
    {
        CurrentCity = cityName;
        CurrentLocationId = locationId;
        OnCityChanged?.Invoke(cityName);

        // Teleport yacht to port position
        if (SeaNavigator.Instance != null && YachtController.Instance != null)
        {
            Vector3 portPos = SeaNavigator.Instance.GetPortWorldPosition(locationId);
            YachtController.Instance.transform.position = portPos + Vector3.forward * 30f;
        }

        Debug.Log($"[GameManager] ⚡ Quick travel to {cityName}");
        ArriveAtPort();
    }

    // ─── Internal ─────────────────────────────────────────────

    void SetState(GameState newState)
    {
        if (CurrentState == newState) return;
        Debug.Log($"[GameManager] State: {CurrentState} → {newState}");
        CurrentState = newState;
        OnGameStateChanged?.Invoke(newState);
    }

    void OnBridgeConnectionChanged(bool connected)
    {
        Debug.Log($"[GameManager] Bridge connection: {(connected ? "✅ ONLINE" : "❌ OFFLINE")}");
    }

    void HandleBridgeMessage(BridgeMessage msg)
    {
        switch (msg.type)
        {
            case "scenario/chain":
                var chain = JsonUtility.FromJson<ScenarioChainData>(JsonUtility.ToJson(msg.payload));
                if (chain != null)
                {
                    HandleScenarioUpdate(chain);
                }
                break;

            case "session/ready":
                Debug.Log("[GameManager] Session initialized — ready to sail");
                break;
        }
    }

    void HandleScenarioUpdate(ScenarioChainData chain)
    {
        if (!chain.active && chain.allRequiredComplete)
        {
            Debug.Log($"[GameManager] ⚓ {chain.cityName} scenario complete!");
            SetState(GameState.Departure);
            return;
        }

        if (chain.currentStep != null)
        {
            string phase = chain.currentStep.phase;
            if (phase == "arrival") SetState(GameState.PortApproach);
            else if (phase == "departure") SetState(GameState.Departure);
            else SetState(GameState.Docked);

            OnScenarioStepChanged?.Invoke(chain.currentStep.id, chain.currentStep.name);
            Debug.Log($"[GameManager] Scenario step: {chain.currentStep.name} (phase: {phase})");
        }
    }

    IEnumerator ReturnToSailing(float delay)
    {
        yield return new WaitForSeconds(delay);
        SetState(GameState.Sailing);
    }

    void ValidateSystems()
    {
        string[] coreSystems = {
            "AAPMBridge", "SeaNavigator", "YachtController", "WeatherSystem",
            "PortRegistryLoader", "RealisticPortGenerator", "PortServicesGenerator",
            "NPCSpawner", "ProgressionManager"
        };

        string[] agents = {
            "NavigationAgent", "CrewAgent", "ScenarioDirector",
            "ProgressionAgent", "WeatherDirector"
        };

        Debug.Log($"[GameManager] ✅ Core systems: {coreSystems.Length}");
        Debug.Log($"[GameManager] 🤖 Agents: {agents.Length}");

        // Log weather on start
        if (WeatherSystem.Instance != null)
        {
            Debug.Log($"[GameManager] 🌤️ {WeatherSystem.Instance.GetWeatherDescription()}");
        }

        // Log agent readiness
        Debug.Log($"[GameManager] 🧭 NavigationAgent: {(NavigationAgent.Instance != null ? "ready" : "missing")}");
        Debug.Log($"[GameManager] 👥 CrewAgent: {(CrewAgent.Instance != null ? "ready" : "missing")}");
        Debug.Log($"[GameManager] 🎬 ScenarioDirector: {(ScenarioDirector.Instance != null ? "ready" : "missing")}");
        Debug.Log($"[GameManager] 📈 ProgressionAgent: {(ProgressionAgent.Instance != null ? "ready" : "missing")}");
        Debug.Log($"[GameManager] 🌊 WeatherDirector: {(WeatherDirector.Instance != null ? "ready" : "missing")}");
    }

    void SubscribeToAgents()
    {
        // NavigationAgent: handle VHF trigger and approach
        if (NavigationAgent.Instance != null)
        {
            NavigationAgent.Instance.OnApproachStarted += (portId) =>
            {
                if (CurrentState == GameState.Sailing)
                {
                    SetState(GameState.PortApproach);
                    // Trigger cultural briefing from crew
                    PortData port = PortRegistryLoader.Instance?.GetPortById(portId);
                    if (port != null)
                    {
                        CrewAgent.Instance?.TriggerCulturalBriefing(
                            port.name, port.country, port.language ?? port.country
                        );
                    }
                }
            };

            NavigationAgent.Instance.OnVHFRequired += () =>
            {
                Debug.Log("[GameManager] 📻 VHF radio contact required");
                // Could open VHF UI here
            };

            NavigationAgent.Instance.OnDecision += (decision) =>
            {
                // Forward to UI for display
                AAPMBridge.Instance?.SendAgentDecision(
                    "navigation", decision.type.ToString(), decision.message
                );
            };
        }

        // CrewAgent: relay crew speech to bridge for AI response
        if (CrewAgent.Instance != null)
        {
            CrewAgent.Instance.OnCrewSpeaks += (member, text) =>
            {
                AAPMBridge.Instance?.SendAgentDecision(
                    "crew", "speak", $"{member.name}: {text}"
                );
            };
        }

        // ScenarioDirector: handle phase changes and departure gating
        if (ScenarioDirector.Instance != null)
        {
            ScenarioDirector.Instance.OnAllRequiredComplete += () =>
            {
                Debug.Log("[GameManager] 🏁 All required phases complete — departure unlocked");
            };

            ScenarioDirector.Instance.OnAmbientEvent += (description) =>
            {
                AAPMBridge.Instance?.SendAgentDecision(
                    "scenario", "ambient_event", description
                );
            };
        }

        // ProgressionAgent: handle achievements and difficulty changes
        if (ProgressionAgent.Instance != null)
        {
            ProgressionAgent.Instance.OnAchievementEarned += (achievement) =>
            {
                Debug.Log($"[GameManager] 🏆 {achievement.icon} {achievement.title}");
                AAPMBridge.Instance?.SendAgentDecision(
                    "progression", "achievement", $"{achievement.icon} {achievement.title}"
                );
            };

            ProgressionAgent.Instance.OnDifficultyChanged += (newLevel) =>
            {
                cefrLevel = newLevel;
                Debug.Log($"[GameManager] 📊 Difficulty adjusted to {newLevel}");
            };
        }

        // WeatherDirector: handle emergency drills and shelter suggestions
        if (WeatherDirector.Instance != null)
        {
            WeatherDirector.Instance.OnEmergencyDrillStarted += () =>
            {
                Debug.Log("[GameManager] ⚠️ Emergency VHF drill triggered by weather");
            };

            WeatherDirector.Instance.OnWeatherDecision += (decision) =>
            {
                AAPMBridge.Instance?.SendAgentDecision(
                    "weather", decision.type.ToString(), decision.message
                );
            };
        }
    }
}
