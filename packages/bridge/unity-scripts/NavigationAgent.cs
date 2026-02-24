/*
 * NavigationAgent.cs — Route planning, hazard awareness, and approach coaching.
 *
 * UNIQUE TO THE YACHTING GAME — no core framework equivalent.
 *
 * Responsibilities:
 *   - Suggest next port based on learner progress + wind/weather
 *   - Coach the player through port approaches ("turn to port for berth 7")
 *   - Warn about hazards (shallow water, traffic separation zones)
 *   - Auto-trigger VHF radio when within approach distance
 *   - Provide contextual sailing tips based on conditions
 *
 * Decisions:
 *   suggest_route, warn_hazard, trigger_approach, coaching_tip
 *
 * Integrates with:
 *   - SeaNavigator (GPS position, distance to port)
 *   - WeatherSystem (wind, sea state)
 *   - YachtController (heading, speed)
 *   - ProgressionAgent (learner's visited ports, skill level)
 *   - AAPMBridge (route queries to TypeScript brain)
 */

using System;
using System.Collections.Generic;
using UnityEngine;

public class NavigationAgent : MonoBehaviour
{
    public static NavigationAgent Instance { get; private set; }

    [Header("Configuration")]
    [Tooltip("Distance in nautical miles to trigger port approach")]
    public float approachDistanceNM = 2.0f;
    [Tooltip("Distance in nautical miles to trigger VHF contact")]
    public float vhfTriggerDistanceNM = 3.0f;
    [Tooltip("Minimum interval between coaching tips (seconds)")]
    public float tipCooldownSeconds = 30f;
    [Tooltip("Distance in nautical miles for hazard warnings")]
    public float hazardWarningDistanceNM = 1.0f;

    // ─── State ────────────────────────────────────────────────

    private string _destinationPortId;
    private string _destinationPortName;
    private Vector3 _destinationWorldPos;
    private bool _isApproaching = false;
    private bool _vhfTriggered = false;
    private float _lastTipTime = -999f;
    private float _lastHazardCheckTime = 0f;
    private List<NavigationDecision> _pendingDecisions = new List<NavigationDecision>();

    // ─── Decision Types ───────────────────────────────────────

    public enum DecisionType
    {
        SuggestRoute,
        WarnHazard,
        TriggerApproach,
        CoachingTip
    }

    public struct NavigationDecision
    {
        public DecisionType type;
        public string message;
        public float confidence;
        public Dictionary<string, object> payload;
    }

    // ─── Events ───────────────────────────────────────────────

    public event Action<NavigationDecision> OnDecision;
    public event Action<string> OnApproachStarted;     // portId
    public event Action OnVHFRequired;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Update()
    {
        if (string.IsNullOrEmpty(_destinationPortId)) return;
        if (SeaNavigator.Instance == null || YachtController.Instance == null) return;

        float distanceNM = GetDistanceToDestinationNM();

        // ── Observe: Check distances and conditions ──
        ObserveNavigation(distanceNM);

        // ── Think: Generate decisions ──
        Think(distanceNM);

        // ── Act: Emit pending decisions ──
        Act();
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Set the current navigation destination.
    /// </summary>
    public void SetDestination(string portId, string portName, Vector3 worldPos)
    {
        _destinationPortId = portId;
        _destinationPortName = portName;
        _destinationWorldPos = worldPos;
        _isApproaching = false;
        _vhfTriggered = false;

        Debug.Log($"[NavigationAgent] 🧭 Destination set: {portName} ({portId})");
    }

    /// <summary>
    /// Clear destination (e.g., after docking).
    /// </summary>
    public void ClearDestination()
    {
        _destinationPortId = null;
        _destinationPortName = null;
        _isApproaching = false;
        _vhfTriggered = false;
    }

    /// <summary>
    /// Request a route suggestion based on learner progress.
    /// Returns ports the player hasn't visited yet, weighted by language variety.
    /// </summary>
    public NavigationDecision SuggestNextPort()
    {
        string suggestion = "";
        string suggestedId = "";

        // Get unvisited ports from PortRegistryLoader
        if (PortRegistryLoader.Instance != null)
        {
            var allPorts = PortRegistryLoader.Instance.GetAllPorts();
            var visitedPorts = ProgressionAgent.Instance?.GetVisitedPortIds() ?? new HashSet<string>();

            // Filter to unvisited, then sort by language diversity
            var languagesSeen = ProgressionAgent.Instance?.GetLanguagesEncountered() ?? new HashSet<string>();
            PortData bestPort = null;
            bool newLanguage = false;

            foreach (var port in allPorts)
            {
                if (visitedPorts.Contains(port.id)) continue;

                // Prefer ports in languages the player hasn't encountered
                if (!languagesSeen.Contains(port.language ?? port.country))
                {
                    bestPort = port;
                    newLanguage = true;
                    break;
                }

                if (bestPort == null) bestPort = port;
            }

            if (bestPort != null)
            {
                suggestedId = bestPort.id;
                suggestion = newLanguage
                    ? $"I suggest {bestPort.name}, {bestPort.country}. You haven't practiced {bestPort.language ?? bestPort.country} yet — it would expand your language skills."
                    : $"How about {bestPort.name}, {bestPort.country}? It's a port you haven't visited yet.";
            }
            else
            {
                suggestion = "You've visited all available ports! Try revisiting one to deepen your skills.";
            }
        }

        return new NavigationDecision
        {
            type = DecisionType.SuggestRoute,
            message = suggestion,
            confidence = 0.8f,
            payload = new Dictionary<string, object> { { "portId", suggestedId } }
        };
    }

    // ─── Observe ──────────────────────────────────────────────

    void ObserveNavigation(float distanceNM)
    {
        // Track approach state transition
        if (!_isApproaching && distanceNM <= approachDistanceNM)
        {
            _isApproaching = true;
            OnApproachStarted?.Invoke(_destinationPortId);
            Debug.Log($"[NavigationAgent] 📡 Entering approach zone for {_destinationPortName}");
        }
    }

    // ─── Think ────────────────────────────────────────────────

    void Think(float distanceNM)
    {
        // VHF trigger
        if (!_vhfTriggered && distanceNM <= vhfTriggerDistanceNM)
        {
            _vhfTriggered = true;
            _pendingDecisions.Add(new NavigationDecision
            {
                type = DecisionType.TriggerApproach,
                message = $"Approaching {_destinationPortName}. Time to contact port control on VHF Channel 16.",
                confidence = 0.95f,
                payload = new Dictionary<string, object>
                {
                    { "portId", _destinationPortId },
                    { "distanceNM", distanceNM }
                }
            });
            OnVHFRequired?.Invoke();
        }

        // Coaching tips (throttled)
        if (Time.time - _lastTipTime >= tipCooldownSeconds)
        {
            string tip = GenerateCoachingTip(distanceNM);
            if (!string.IsNullOrEmpty(tip))
            {
                _lastTipTime = Time.time;
                _pendingDecisions.Add(new NavigationDecision
                {
                    type = DecisionType.CoachingTip,
                    message = tip,
                    confidence = 0.6f,
                    payload = new Dictionary<string, object>()
                });
            }
        }

        // Hazard checks (every 5 seconds)
        if (Time.time - _lastHazardCheckTime >= 5f)
        {
            _lastHazardCheckTime = Time.time;
            string hazard = CheckForHazards();
            if (!string.IsNullOrEmpty(hazard))
            {
                _pendingDecisions.Add(new NavigationDecision
                {
                    type = DecisionType.WarnHazard,
                    message = hazard,
                    confidence = 0.9f,
                    payload = new Dictionary<string, object>()
                });
            }
        }
    }

    // ─── Act ──────────────────────────────────────────────────

    void Act()
    {
        foreach (var decision in _pendingDecisions)
        {
            OnDecision?.Invoke(decision);
            Debug.Log($"[NavigationAgent] Decision: [{decision.type}] {decision.message}");
        }
        _pendingDecisions.Clear();
    }

    // ─── Coaching Tips ────────────────────────────────────────

    string GenerateCoachingTip(float distanceNM)
    {
        if (WeatherSystem.Instance == null || YachtController.Instance == null) return null;

        float windSpeed = WeatherSystem.Instance.GetWindSpeed();
        float beaufort = WeatherSystem.Instance.GetBeaufortScale();
        float heading = YachtController.Instance.transform.eulerAngles.y;

        // Wind-based tips
        if (beaufort >= 6)
            return "Force 6 winds. Consider reducing speed and keeping a good lookout. In these conditions, say 'mar agitado' (rough sea) if asked.";
        if (beaufort >= 4 && _isApproaching)
            return $"Moderate winds on approach. Keep your bow into the wind when docking — say 'atracar a barlovento' (dock windward).";

        // Distance-based tips
        if (distanceNM > 10 && distanceNM < 12)
            return $"{_destinationPortName} is about {distanceNM:F0} nautical miles away. ETA roughly {(distanceNM / 6f):F0} hours at cruising speed.";
        if (distanceNM <= approachDistanceNM + 1 && distanceNM > approachDistanceNM)
            return $"Getting close to {_destinationPortName}. Check your chart and prepare fenders — the word for fender is 'defensa'.";

        // Time-of-day tips
        float timeOfDay = WeatherSystem.Instance.GetTimeOfDay();
        if (timeOfDay > 0.8f) // Evening
            return "Getting late. Most port offices close by 6pm. The word for 'night' in Mediterranean ports: noche (ES), nuit (FR), notte (IT), νύχτα (EL).";

        return null;
    }

    // ─── Hazard Detection ─────────────────────────────────────

    string CheckForHazards()
    {
        if (YachtController.Instance == null) return null;

        Vector3 pos = YachtController.Instance.transform.position;
        float speed = YachtController.Instance.GetSpeed();

        // Speed warning near port
        if (_isApproaching && speed > 5f)
            return "⚠️ Reduce speed — most ports have a 3-knot speed limit in the approach channel. 'Reducir velocidad' means reduce speed.";

        // Night approach warning
        if (WeatherSystem.Instance != null && WeatherSystem.Instance.GetTimeOfDay() > 0.85f && _isApproaching)
            return "⚠️ Night approach. Look for the port entry lights — green to starboard, red to port. 'Luces de entrada' means entry lights.";

        return null;
    }

    // ─── Utility ──────────────────────────────────────────────

    float GetDistanceToDestinationNM()
    {
        if (YachtController.Instance == null) return float.MaxValue;
        float worldDistance = Vector3.Distance(
            YachtController.Instance.transform.position,
            _destinationWorldPos
        );
        // Convert Unity units to approximate nautical miles
        // (depends on your world scale — 1 Unity unit ≈ 1 meter typical)
        return worldDistance / 1852f;
    }
}
