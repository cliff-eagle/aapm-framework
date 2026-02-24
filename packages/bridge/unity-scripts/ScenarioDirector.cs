/*
 * ScenarioDirector.cs — Port scenario phase sequencing and event injection.
 *
 * Unity-side counterpart to the TypeScript WorldAgent. Handles real-time
 * game sequencing that needs frame-by-frame awareness.
 *
 * Responsibilities:
 *   - Sequence scenario phases at port (VHF → dock → immigration → explore → depart)
 *   - Enforce required phases, offer optional ones
 *   - Time pressure: "harbormaster wants clearance before 6pm"
 *   - Inject ambient events (market day, storm, fishing fleet)
 *   - Gate departure until required phases complete
 *   - Track phase completion and relay to bridge
 *
 * Decisions:
 *   advance_phase, inject_event, block_departure, unlock_optional
 *
 * Integrates with:
 *   - PortScenarioLoader (scenario data)
 *   - GameManager (game state transitions)
 *   - NPCInteraction (detect NPC dialogue completion)
 *   - WeatherSystem (weather-triggered events)
 *   - AAPMBridge (relay phase completions to TypeScript)
 */

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class ScenarioDirector : MonoBehaviour
{
    public static ScenarioDirector Instance { get; private set; }

    [Header("Configuration")]
    [Tooltip("Max minutes in port before time pressure kicks in")]
    public float timePressureMinutes = 45f;
    [Tooltip("Seconds between ambient event checks")]
    public float eventCheckInterval = 60f;

    // ─── State ────────────────────────────────────────────────

    private PortScenario _activeScenario;
    private int _currentPhaseIndex = -1;
    private Dictionary<string, PhaseStatus> _phaseStatuses = new Dictionary<string, PhaseStatus>();
    private float _dockTime;
    private float _lastEventCheckTime;
    private List<ActiveAmbientEvent> _activeEvents = new List<ActiveAmbientEvent>();
    private bool _timePressureAnnounced = false;
    private bool _departureBlocked = true;

    // ─── Types ────────────────────────────────────────────────

    public enum PhaseState { Locked, Available, Active, Completed, Skipped }

    public struct PhaseStatus
    {
        public string phaseId;
        public string phaseName;
        public PhaseState state;
        public bool required;
        public float completedAt;
    }

    public enum DecisionType
    {
        AdvancePhase,
        InjectEvent,
        BlockDeparture,
        UnlockOptional,
        TimePressure,
        ScenarioComplete
    }

    public struct DirectorDecision
    {
        public DecisionType type;
        public string message;
        public float confidence;
        public Dictionary<string, object> payload;
    }

    struct ActiveAmbientEvent
    {
        public string id;
        public string description;
        public float startTime;
        public float duration;
        public string[] involvedNpcs;
    }

    // ─── Events ───────────────────────────────────────────────

    public event Action<DirectorDecision> OnDirectorDecision;
    public event Action<PhaseStatus> OnPhaseChanged;
    public event Action OnAllRequiredComplete;
    public event Action<string> OnAmbientEvent;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Update()
    {
        if (_activeScenario == null) return;
        if (GameManager.Instance?.CurrentState != GameState.Docked) return;

        float elapsed = Time.time - _dockTime;

        // ── Think ──

        // Time pressure check
        if (!_timePressureAnnounced && elapsed > timePressureMinutes * 60f * 0.75f)
        {
            _timePressureAnnounced = true;
            float remainingMin = timePressureMinutes - (elapsed / 60f);
            EmitDecision(new DirectorDecision
            {
                type = DecisionType.TimePressure,
                message = $"The port authority needs your departure papers within {remainingMin:F0} minutes. Have you completed immigration?",
                confidence = 0.85f,
                payload = new Dictionary<string, object>
                {
                    { "remainingMinutes", remainingMin },
                    { "elapsedMinutes", elapsed / 60f }
                }
            });
        }

        // Ambient event injection
        if (Time.time - _lastEventCheckTime >= eventCheckInterval)
        {
            _lastEventCheckTime = Time.time;
            TryInjectAmbientEvent(elapsed);
        }

        // Clean up expired events
        _activeEvents.RemoveAll(e => Time.time > e.startTime + e.duration);

        // Check departure eligibility
        CheckDepartureEligibility();
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Start a scenario for the current port.
    /// </summary>
    public void StartScenario(string portId, string portName, string country)
    {
        PortScenario scenario = PortScenarioLoader.Instance?.GetScenario(portId, portName, country);
        if (scenario == null)
        {
            Debug.LogWarning($"[ScenarioDirector] No scenario found for {portId}");
            return;
        }

        _activeScenario = scenario;
        _currentPhaseIndex = 0;
        _dockTime = Time.time;
        _lastEventCheckTime = Time.time;
        _timePressureAnnounced = false;
        _departureBlocked = true;
        _phaseStatuses.Clear();
        _activeEvents.Clear();

        // Initialize phase statuses
        for (int i = 0; i < scenario.phases.Count; i++)
        {
            var phase = scenario.phases[i];
            _phaseStatuses[phase.id] = new PhaseStatus
            {
                phaseId = phase.id,
                phaseName = phase.name,
                state = i == 0 ? PhaseState.Available : (phase.required ? PhaseState.Locked : PhaseState.Locked),
                required = phase.required,
                completedAt = 0
            };
        }

        // Make first phase active
        if (scenario.phases.Count > 0)
        {
            ActivatePhase(scenario.phases[0].id);
        }

        Debug.Log($"[ScenarioDirector] 🎬 Started scenario for {portName}: {scenario.phases.Count} phases");

        // Relay to bridge
        AAPMBridge.Instance?.SendScenarioState(portId, "started", GetPhaseStatusList());
    }

    /// <summary>
    /// Mark a phase as completed (called when NPC interaction finishes).
    /// </summary>
    public void CompletePhase(string phaseId)
    {
        if (!_phaseStatuses.ContainsKey(phaseId)) return;

        var status = _phaseStatuses[phaseId];
        if (status.state == PhaseState.Completed) return;

        status.state = PhaseState.Completed;
        status.completedAt = Time.time;
        _phaseStatuses[phaseId] = status;
        OnPhaseChanged?.Invoke(status);

        Debug.Log($"[ScenarioDirector] ✅ Phase complete: {status.phaseName}");

        // Unlock next phases
        UnlockNextPhases(phaseId);

        // Advance to next available required phase
        AdvanceToNextPhase();

        // Relay to bridge
        AAPMBridge.Instance?.SendScenarioState(
            _activeScenario.portId, "phase_complete", GetPhaseStatusList()
        );
    }

    /// <summary>
    /// Skip an optional phase.
    /// </summary>
    public void SkipPhase(string phaseId)
    {
        if (!_phaseStatuses.ContainsKey(phaseId)) return;
        var status = _phaseStatuses[phaseId];
        if (status.required) return; // Can't skip required phases

        status.state = PhaseState.Skipped;
        _phaseStatuses[phaseId] = status;
        OnPhaseChanged?.Invoke(status);

        Debug.Log($"[ScenarioDirector] ⏭️ Skipped optional phase: {status.phaseName}");
        UnlockNextPhases(phaseId);
        AdvanceToNextPhase();
    }

    /// <summary>
    /// Check if departure is allowed.
    /// </summary>
    public bool CanDepart()
    {
        return !_departureBlocked;
    }

    /// <summary>
    /// Get current scenario state for UI display.
    /// </summary>
    public List<PhaseStatus> GetPhaseStatusList()
    {
        if (_activeScenario == null) return new List<PhaseStatus>();
        return _activeScenario.phases.Select(p =>
            _phaseStatuses.ContainsKey(p.id) ? _phaseStatuses[p.id] : default
        ).ToList();
    }

    /// <summary>
    /// Get current active phase name (for HUD).
    /// </summary>
    public string GetCurrentPhaseName()
    {
        if (_activeScenario == null || _currentPhaseIndex < 0) return "";
        if (_currentPhaseIndex >= _activeScenario.phases.Count) return "Free Exploration";
        return _activeScenario.phases[_currentPhaseIndex].name;
    }

    /// <summary>
    /// Clean up when departing port.
    /// </summary>
    public void EndScenario()
    {
        if (_activeScenario == null) return;

        int completed = _phaseStatuses.Values.Count(s => s.state == PhaseState.Completed);
        int total = _activeScenario.phases.Count;
        float duration = (Time.time - _dockTime) / 60f;

        Debug.Log($"[ScenarioDirector] 🎬 Scenario ended: {completed}/{total} phases in {duration:F1} minutes");

        AAPMBridge.Instance?.SendScenarioState(
            _activeScenario.portId, "completed", GetPhaseStatusList()
        );

        _activeScenario = null;
        _currentPhaseIndex = -1;
        _phaseStatuses.Clear();
        _activeEvents.Clear();
    }

    // ─── Internal ─────────────────────────────────────────────

    void ActivatePhase(string phaseId)
    {
        if (!_phaseStatuses.ContainsKey(phaseId)) return;
        var status = _phaseStatuses[phaseId];
        status.state = PhaseState.Active;
        _phaseStatuses[phaseId] = status;
        OnPhaseChanged?.Invoke(status);

        EmitDecision(new DirectorDecision
        {
            type = DecisionType.AdvancePhase,
            message = $"Current objective: {status.phaseName}",
            confidence = 0.9f,
            payload = new Dictionary<string, object>
            {
                { "phaseId", phaseId },
                { "phaseName", status.phaseName },
                { "required", status.required }
            }
        });
    }

    void UnlockNextPhases(string completedPhaseId)
    {
        int completedIndex = _activeScenario.phases.FindIndex(p => p.id == completedPhaseId);
        if (completedIndex < 0) return;

        // Unlock all subsequent phases up to the next required one
        for (int i = completedIndex + 1; i < _activeScenario.phases.Count; i++)
        {
            var phase = _activeScenario.phases[i];
            if (_phaseStatuses[phase.id].state == PhaseState.Locked)
            {
                var status = _phaseStatuses[phase.id];
                status.state = PhaseState.Available;
                _phaseStatuses[phase.id] = status;

                if (!phase.required)
                {
                    EmitDecision(new DirectorDecision
                    {
                        type = DecisionType.UnlockOptional,
                        message = $"Optional: {phase.name} is now available",
                        confidence = 0.7f,
                        payload = new Dictionary<string, object> { { "phaseId", phase.id } }
                    });
                }
            }

            // Stop at the next required phase (don't unlock beyond it)
            if (phase.required) break;
        }
    }

    void AdvanceToNextPhase()
    {
        for (int i = 0; i < _activeScenario.phases.Count; i++)
        {
            var phase = _activeScenario.phases[i];
            var status = _phaseStatuses[phase.id];
            if (status.state == PhaseState.Available && phase.required)
            {
                _currentPhaseIndex = i;
                ActivatePhase(phase.id);
                return;
            }
        }

        // All required phases done — allow free exploration
        _currentPhaseIndex = _activeScenario.phases.Count;
    }

    void CheckDepartureEligibility()
    {
        bool allRequiredDone = _activeScenario.phases
            .Where(p => p.required)
            .All(p => _phaseStatuses[p.id].state == PhaseState.Completed);

        if (allRequiredDone && _departureBlocked)
        {
            _departureBlocked = false;
            OnAllRequiredComplete?.Invoke();

            EmitDecision(new DirectorDecision
            {
                type = DecisionType.ScenarioComplete,
                message = "All required objectives complete! You may depart when ready, or continue exploring.",
                confidence = 0.95f,
                payload = new Dictionary<string, object>()
            });
        }
    }

    void TryInjectAmbientEvent(float elapsedSinceDock)
    {
        if (_activeEvents.Count >= 2) return; // Max 2 concurrent events

        // Weather event
        float beaufort = WeatherSystem.Instance?.GetBeaufortScale() ?? 3;
        if (beaufort >= 5 && !_activeEvents.Any(e => e.id == "storm_warning"))
        {
            var stormEvent = new ActiveAmbientEvent
            {
                id = "storm_warning",
                description = "A storm is approaching! The harbormaster is advising all vessels to secure their moorings.",
                startTime = Time.time,
                duration = 300f, // 5 minutes
                involvedNpcs = new[] { "harbor-master" }
            };
            _activeEvents.Add(stormEvent);
            OnAmbientEvent?.Invoke(stormEvent.description);

            EmitDecision(new DirectorDecision
            {
                type = DecisionType.InjectEvent,
                message = stormEvent.description,
                confidence = 0.85f,
                payload = new Dictionary<string, object> { { "eventId", "storm_warning" } }
            });
        }

        // Market day event (30% chance after 10 minutes)
        if (elapsedSinceDock > 600f && UnityEngine.Random.value < 0.3f &&
            !_activeEvents.Any(e => e.id == "market_day"))
        {
            var marketEvent = new ActiveAmbientEvent
            {
                id = "market_day",
                description = "The weekly market is setting up in the square! Fresh produce and local crafts — great chance to practice bargaining vocabulary.",
                startTime = Time.time,
                duration = 600f,
                involvedNpcs = new[] { "market-vendor" }
            };
            _activeEvents.Add(marketEvent);
            OnAmbientEvent?.Invoke(marketEvent.description);

            EmitDecision(new DirectorDecision
            {
                type = DecisionType.InjectEvent,
                message = marketEvent.description,
                confidence = 0.65f,
                payload = new Dictionary<string, object> { { "eventId", "market_day" } }
            });
        }

        // Fishing fleet arrival (20% chance after 20 minutes)
        if (elapsedSinceDock > 1200f && UnityEngine.Random.value < 0.2f &&
            !_activeEvents.Any(e => e.id == "fishing_fleet"))
        {
            var fishEvent = new ActiveAmbientEvent
            {
                id = "fishing_fleet",
                description = "The fishing fleet is returning! Head to the quay to see the catch and learn the names of local fish.",
                startTime = Time.time,
                duration = 480f,
                involvedNpcs = new[] { "fisherman" }
            };
            _activeEvents.Add(fishEvent);
            OnAmbientEvent?.Invoke(fishEvent.description);

            EmitDecision(new DirectorDecision
            {
                type = DecisionType.InjectEvent,
                message = fishEvent.description,
                confidence = 0.6f,
                payload = new Dictionary<string, object> { { "eventId", "fishing_fleet" } }
            });
        }
    }

    void EmitDecision(DirectorDecision decision)
    {
        OnDirectorDecision?.Invoke(decision);
        Debug.Log($"[ScenarioDirector] [{decision.type}] {decision.message}");
    }
}
