/*
 * CrewAgent.cs — Proactive crew companion conversations.
 *
 * Extends the core NPCAgent concept with PROACTIVE initiation —
 * crew members talk to the player unprompted, unlike port NPCs
 * who wait to be approached.
 *
 * Responsibilities:
 *   - Initiate conversations based on context (weather, time, destination)
 *   - Cultural briefings before port arrival
 *   - Language coaching: prep vocabulary for the next port's language
 *   - Relationship tracking: crew bonds evolve over ports visited together
 *   - Meal-time conversations in the galley
 *
 * Decisions:
 *   initiate_conversation, give_cultural_briefing, suggest_vocabulary
 *
 * Integrates with:
 *   - YachtInterior (room awareness — bridge, galley, crew quarters)
 *   - NavigationAgent (destination info for briefings)
 *   - WeatherSystem (weather-driven conversation hooks)
 *   - ProgressionAgent (learner's vocabulary gaps)
 *   - AAPMBridge (AI dialogue generation)
 */

using System;
using System.Collections.Generic;
using UnityEngine;

public class CrewAgent : MonoBehaviour
{
    public static CrewAgent Instance { get; private set; }

    [Header("Configuration")]
    [Tooltip("Minimum seconds between unsolicited crew conversations")]
    public float conversationCooldown = 120f;
    [Tooltip("Distance from port (NM) to trigger cultural briefing")]
    public float briefingDistanceNM = 8f;

    // ─── Crew Members ─────────────────────────────────────────

    [Serializable]
    public class CrewMember
    {
        public string id;
        public string name;
        public string role;
        public string[] languages;
        public string personality;
        public float bond;              // 0.0 → 1.0 (grows over time)
        public int conversationCount;
        public string speciality;       // e.g., "navigation", "cooking", "engineering"
    }

    public List<CrewMember> crew = new List<CrewMember>
    {
        new CrewMember {
            id = "sofia", name = "Sofia", role = "Chief Engineer",
            languages = new[] { "Greek", "Italian", "English" },
            personality = "Patient, uses maritime situations to teach. Corrects gently with humor.",
            bond = 0.3f, conversationCount = 0, speciality = "engineering"
        },
        new CrewMember {
            id = "marco", name = "Marco", role = "First Mate",
            languages = new[] { "Italian", "Spanish", "English" },
            personality = "Enthusiastic, loves sailing and food. Speaks rapidly when excited.",
            bond = 0.3f, conversationCount = 0, speciality = "navigation"
        },
        new CrewMember {
            id = "amara", name = "Amara", role = "Cook",
            languages = new[] { "Arabic", "French", "English" },
            personality = "Warm and motherly. Uses cooking to teach vocabulary.",
            bond = 0.3f, conversationCount = 0, speciality = "cooking"
        }
    };

    // ─── State ────────────────────────────────────────────────

    private float _lastConversationTime = -999f;
    private bool _culturalBriefingGiven = false;
    private string _lastDestinationId = "";
    private List<CrewDecision> _pendingDecisions = new List<CrewDecision>();

    // ─── Decision Types ───────────────────────────────────────

    public enum DecisionType
    {
        InitiateConversation,
        CulturalBriefing,
        VocabularySuggestion,
        MealConversation,
        StoryTime
    }

    public struct CrewDecision
    {
        public DecisionType type;
        public string crewMemberId;
        public string message;
        public float confidence;
        public Dictionary<string, object> payload;
    }

    // ─── Events ───────────────────────────────────────────────

    public event Action<CrewDecision> OnCrewDecision;
    public event Action<CrewMember, string> OnCrewSpeaks; // (who, what)

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Update()
    {
        if (GameManager.Instance == null) return;
        if (GameManager.Instance.CurrentState != GameState.Sailing) return;

        // Only think when at sea
        float elapsed = Time.time;

        // Cooldown check
        if (elapsed - _lastConversationTime < conversationCooldown) return;

        // Observe context
        string destId = GameManager.Instance.CurrentLocationId ?? "";
        if (destId != _lastDestinationId)
        {
            _lastDestinationId = destId;
            _culturalBriefingGiven = false;
        }

        // Think
        Think();

        // Act
        foreach (var decision in _pendingDecisions)
        {
            OnCrewDecision?.Invoke(decision);
            var member = GetCrewMember(decision.crewMemberId);
            if (member != null)
            {
                member.conversationCount++;
                member.bond = Mathf.Min(1f, member.bond + 0.02f);
                OnCrewSpeaks?.Invoke(member, decision.message);
            }
            Debug.Log($"[CrewAgent] {decision.crewMemberId}: [{decision.type}] {decision.message}");
        }
        if (_pendingDecisions.Count > 0) _lastConversationTime = elapsed;
        _pendingDecisions.Clear();
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Get a crew member by ID.
    /// </summary>
    public CrewMember GetCrewMember(string id)
    {
        return crew.Find(c => c.id == id);
    }

    /// <summary>
    /// Get all crew bonds for persistence.
    /// </summary>
    public Dictionary<string, float> GetCrewBonds()
    {
        var bonds = new Dictionary<string, float>();
        foreach (var c in crew) bonds[c.id] = c.bond;
        return bonds;
    }

    /// <summary>
    /// Force a cultural briefing (called by NavigationAgent on approach).
    /// </summary>
    public void TriggerCulturalBriefing(string portName, string country, string language)
    {
        if (_culturalBriefingGiven) return;
        _culturalBriefingGiven = true;

        // Pick the crew member who speaks the destination language
        CrewMember bestCrew = null;
        foreach (var c in crew)
        {
            foreach (var lang in c.languages)
            {
                if (lang.Equals(language, StringComparison.OrdinalIgnoreCase))
                {
                    bestCrew = c;
                    break;
                }
            }
            if (bestCrew != null) break;
        }
        if (bestCrew == null) bestCrew = crew[0]; // fallback

        string briefing = GenerateCulturalBriefing(bestCrew, portName, country, language);

        _pendingDecisions.Add(new CrewDecision
        {
            type = DecisionType.CulturalBriefing,
            crewMemberId = bestCrew.id,
            message = briefing,
            confidence = 0.9f,
            payload = new Dictionary<string, object>
            {
                { "portName", portName },
                { "country", country },
                { "language", language }
            }
        });
    }

    // ─── Think ────────────────────────────────────────────────

    void Think()
    {
        float timeOfDay = WeatherSystem.Instance?.GetTimeOfDay() ?? 0.5f;
        float beaufort = WeatherSystem.Instance?.GetBeaufortScale() ?? 3;

        // ── Meal-time conversations ──
        if (IsNearMealTime(timeOfDay))
        {
            var amara = GetCrewMember("amara");
            if (amara != null)
            {
                string country = GameManager.Instance.CurrentCountry ?? "Mediterranean";
                _pendingDecisions.Add(new CrewDecision
                {
                    type = DecisionType.MealConversation,
                    crewMemberId = "amara",
                    message = GenerateMealConversation(amara, country, timeOfDay),
                    confidence = 0.7f,
                    payload = new Dictionary<string, object> { { "mealType", GetMealType(timeOfDay) } }
                });
                return;
            }
        }

        // ── Weather-driven conversations ──
        if (beaufort >= 5)
        {
            var marco = GetCrewMember("marco");
            if (marco != null)
            {
                _pendingDecisions.Add(new CrewDecision
                {
                    type = DecisionType.InitiateConversation,
                    crewMemberId = "marco",
                    message = $"Captain, the wind is picking up — Beaufort {beaufort:F0}. " +
                              "Should we reef the sails or change course? The Italian word for 'strong wind' is 'vento forte'.",
                    confidence = 0.75f,
                    payload = new Dictionary<string, object> { { "topic", "weather" } }
                });
                return;
            }
        }

        // ── Night watch conversations ──
        if (timeOfDay > 0.85f || timeOfDay < 0.15f)
        {
            var sofia = GetCrewMember("sofia");
            if (sofia != null)
            {
                _pendingDecisions.Add(new CrewDecision
                {
                    type = DecisionType.StoryTime,
                    crewMemberId = "sofia",
                    message = GenerateNightWatchStory(sofia),
                    confidence = 0.6f,
                    payload = new Dictionary<string, object> { { "topic", "night_watch" } }
                });
                return;
            }
        }

        // ── Vocabulary prep before port ──
        if (NavigationAgent.Instance != null)
        {
            float distNM = NavigationAgent.Instance.GetDistanceToDestinationNM();
            if (distNM > 0 && distNM <= briefingDistanceNM && !_culturalBriefingGiven)
            {
                string portName = GameManager.Instance.CurrentCity ?? "the next port";
                string country = GameManager.Instance.CurrentCountry ?? "";

                // Get language for destination
                PortData port = PortRegistryLoader.Instance?.GetPortById(GameManager.Instance.CurrentLocationId);
                string language = port?.language ?? port?.country ?? "";

                TriggerCulturalBriefing(portName, country, language);
            }
        }
    }

    // ─── Content Generation ───────────────────────────────────

    string GenerateCulturalBriefing(CrewMember member, string portName, string country, string language)
    {
        // Country-specific briefings
        Dictionary<string, string> briefings = new Dictionary<string, string>
        {
            { "Spain", $"Captain, we're approaching {portName}. In Spain, remember: lunch is between 2 and 4pm, dinner after 9pm. " +
                        "Greet the harbormaster with '¡Buenos días!' and have your papers ready. They appreciate politeness." },
            { "France", $"Captain, {portName} ahead. In French ports, always say 'Bonjour' first — never jump straight to business. " +
                         "The capitainerie will want your crew list. Port offices usually close for lunch from 12 to 2." },
            { "Italy", $"Captain, approaching {portName}. Italians are warm but bureaucratic in ports. " +
                        "Say 'Buongiorno' and be patient with paperwork. Never rush them — 'piano piano' is the local philosophy." },
            { "Greece", $"Captain, {portName} coming up. Greek ports are relaxed but thorough. " +
                         "Say 'Kalimera' (good morning) or 'Kalispera' (good evening). They may invite you for coffee — always accept." },
            { "Turkey", $"Captain, we're nearing {portName}. Turkish hospitality is legendary — you may be offered çay (tea). " +
                         "Greet with 'Merhaba' and have your transit log ready. The agent system handles most paperwork." },
            { "Morocco", $"Captain, {portName} ahead. Moroccan ports require patience. Greet with 'Salaam alaikum'. " +
                          "A port agent is recommended — Amara, could you help translate? Have your crew list in triplicate." }
        };

        if (briefings.TryGetValue(country, out string briefing))
            return briefing;

        return $"Captain, we're approaching {portName}, {country}. I'll help you with the local language — let me know if you need any phrases.";
    }

    string GenerateMealConversation(CrewMember amara, string country, float timeOfDay)
    {
        string meal = GetMealType(timeOfDay);
        Dictionary<string, string> mealChats = new Dictionary<string, string>
        {
            { "Spain", $"Captain, time for {meal}! I'm making a tortilla española tonight. The word for 'egg' in Spanish is 'huevo', and 'potato' is 'patata'." },
            { "France", $"Captain, {meal} is ready! I prepared a ratatouille — that's 'rata-too-ee'. The French word for 'delicious' is 'délicieux'." },
            { "Italy", $"Captain, {meal}! I made pasta con le sarde — that means 'pasta with sardines'. In Italian, 'fish' is 'pesce', pronounced 'peh-sheh'." },
            { "Greece", $"Captain, come eat! I made a horiatiki — Greek village salad. 'Hungry' in Greek is 'πεινασμένος' — pee-naz-MEN-os." },
            { "Turkey", $"Captain, {meal} is served! Tonight it's mercimek çorbası — red lentil soup. 'Tasty' in Turkish is 'lezzetli'." }
        };

        if (mealChats.TryGetValue(country, out string chat))
            return chat;

        return $"Captain, {meal} is ready! Come to the galley — I want to teach you the local words for tonight's ingredients.";
    }

    string GenerateNightWatchStory(CrewMember member)
    {
        string[] stories = new string[]
        {
            "Quiet night. You know, my grandmother in Rhodes used to say 'η θάλασσα δεν έχει φίλους' — the sea has no friends. But I think she was wrong about that.",
            "Beautiful stars tonight. In Greek, we call the Milky Way 'Γαλαξίας' — Galaxias. That's where the English word 'galaxy' comes from.",
            "I was checking the engine earlier. Everything's running smoothly — 'tutto bene' as Marco would say. That means 'all good' in Italian.",
            "On nights like this, I miss my father's fishing boat. He taught me to read the stars before GPS. 'Βόρειος αστέρας' — the North Star... always reliable.",
            "Did you know the Mediterranean means 'middle of the land' in Latin? 'Medi' is middle, 'terra' is land. The sea between the continents."
        };

        return stories[UnityEngine.Random.Range(0, stories.Length)];
    }

    // ─── Utility ──────────────────────────────────────────────

    bool IsNearMealTime(float timeOfDay)
    {
        // Breakfast: 0.28-0.32 (7-8am), Lunch: 0.50-0.55 (12-1pm), Dinner: 0.79-0.83 (7-8pm)
        return (timeOfDay > 0.28f && timeOfDay < 0.32f) ||
               (timeOfDay > 0.50f && timeOfDay < 0.55f) ||
               (timeOfDay > 0.79f && timeOfDay < 0.83f);
    }

    string GetMealType(float timeOfDay)
    {
        if (timeOfDay < 0.35f) return "breakfast";
        if (timeOfDay < 0.60f) return "lunch";
        return "dinner";
    }
}
