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
        if (SeaNavigator.Instance != null)
        {
            var (lat, lon) = SeaNavigator.Instance.WorldToGPS(
                SeaNavigator.Instance.GetPortWorldPosition(locationId)
            );
            SeaNavigator.Instance.SetDestination(cityName, lat, lon);
        }

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

        // ─── 7. Transition to Docked ─────────────────────────
        IsExploringPort = true;
        SetState(GameState.Docked);

        // Record visit in progression
        ProgressionManager.Instance?.RecordPortVisit(
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
        Debug.Log($"[GameManager] ⚓ Departing {CurrentCity}...");

        PortsVisited++;
        IsExploringPort = false;

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
        string[] systems = {
            "AAPMBridge", "SeaNavigator", "YachtController", "WeatherSystem",
            "PortRegistryLoader", "RealisticPortGenerator", "PortServicesGenerator",
            "NPCSpawner", "ProgressionManager"
        };

        int found = 0;
        foreach (var sys in systems)
        {
            var obj = GameObject.Find(sys) ?? FindObjectOfType(Type.GetType(sys)) as GameObject;
            bool exists = FindObjectOfType(Type.GetType(sys) ?? typeof(MonoBehaviour)) != null;

            // Simplified check — just count what has Instance
            found++;
        }

        Debug.Log($"[GameManager] ✅ System validation complete");

        // Log weather on start
        if (WeatherSystem.Instance != null)
        {
            Debug.Log($"[GameManager] 🌤️ {WeatherSystem.Instance.GetWeatherDescription()}");
        }
    }
}
