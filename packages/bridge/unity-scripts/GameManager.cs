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
 *   Onboarding → API Key Entry → Session Init → Port Selection →
 *   Scenario Chain (VHF→Harbor→Customs→Fuel→Explore→Depart) → Next Port
 */

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public enum GameState
{
    Onboarding,       // Language/difficulty selection + API key
    Sailing,          // Between ports — crew conversations
    PortApproach,     // VHF radio call phase
    Docked,           // Harbor master, customs, exploration
    Departure,        // Requesting permission to leave
    Summary           // Port visit summary
}

/// <summary>
/// Singleton game orchestrator. Controls game phase transitions,
/// session management, and coordinates all other managers.
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
    public int PortsVisited { get; private set; } = 0;

    // ─── Events ───────────────────────────────────────────────

    public event Action<GameState> OnGameStateChanged;
    public event Action<string> OnCityChanged;
    public event Action<string, string> OnScenarioStepChanged; // (stepId, stepName)

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

        Debug.Log($"[GameManager] ⚓ Sailing to {cityName}");

        // Navigate in the AAPM world
        AAPMBridge.Instance?.Navigate(locationId);

        // Start the scenario chain for this port
        AAPMBridge.Instance?.StartScenario(cityName, locationId);

        SetState(GameState.PortApproach);
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
        PortsVisited++;
        SetState(GameState.Summary);

        // After summary, go back to sailing
        StartCoroutine(ReturnToSailing(5f));
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
            // All required steps done — player can depart
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
}
