/*
 * ProgressionAgent.cs — Long-term learner progression and game difficulty.
 *
 * Unity-side complement to the TypeScript EvaluationAgent. While the
 * TS agent does fine-grained linguistic analysis, this handles
 * game-visible progression: achievements, difficulty scaling, and
 * port recommendations.
 *
 * Responsibilities:
 *   - Track vocabulary mastery per language
 *   - Track scenario completion stats
 *   - Scale difficulty (NPC speech speed, vocab complexity)
 *   - Achievement system with milestones
 *   - Recommend next port based on language exposure gaps
 *   - Generate end-of-port summary reports
 *
 * Decisions:
 *   adjust_difficulty, award_achievement, recommend_port, generate_summary
 *
 * Integrates with:
 *   - AAPMBridge (receives metrics from EvaluationAgent)
 *   - GameManager (port visit tracking)
 *   - ScenarioDirector (phase completion data)
 *   - NPCController (speech speed adjustment)
 */

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class ProgressionAgent : MonoBehaviour
{
    public static ProgressionAgent Instance { get; private set; }

    // ─── Difficulty Settings ──────────────────────────────────

    [Header("Difficulty")]
    [Range(0.5f, 2.0f)]
    public float npcSpeechSpeed = 1.0f;      // 0.5 = slow, 2.0 = native
    [Range(0f, 1f)]
    public float vocabularyComplexity = 0.5f; // 0 = basic, 1 = advanced
    [Range(0f, 1f)]
    public float scenarioLength = 0.5f;       // 0 = shortest, 1 = full
    public string effectiveCefrLevel = "A2";  // Adjusted from bridge metrics

    // ─── Tracked Data ─────────────────────────────────────────

    private HashSet<string> _visitedPortIds = new HashSet<string>();
    private HashSet<string> _languagesEncountered = new HashSet<string>();
    private Dictionary<string, int> _portVisitCounts = new Dictionary<string, int>();
    private Dictionary<string, float> _languageScores = new Dictionary<string, float>();
    private HashSet<string> _learnedWords = new HashSet<string>();
    private HashSet<string> _earnedAchievements = new HashSet<string>();
    private List<PortVisitRecord> _visitHistory = new List<PortVisitRecord>();
    private int _totalNpcInteractions = 0;
    private int _totalScenariosCompleted = 0;
    private float _bestAccuracy = 0f;
    private float _bestFluency = 0f;

    // ─── Types ────────────────────────────────────────────────

    [Serializable]
    public struct PortVisitRecord
    {
        public string portId;
        public string portName;
        public string country;
        public string language;
        public float timestamp;
        public int phasesCompleted;
        public int totalPhases;
        public float accuracy;
        public float fluency;
        public int wordsLearned;
    }

    public struct Achievement
    {
        public string id;
        public string title;
        public string description;
        public string icon;
    }

    public enum DecisionType
    {
        AdjustDifficulty,
        AwardAchievement,
        RecommendPort,
        GenerateSummary,
        MilestoneReached
    }

    public struct ProgressionDecision
    {
        public DecisionType type;
        public string message;
        public float confidence;
        public Dictionary<string, object> payload;
    }

    // ─── Events ───────────────────────────────────────────────

    public event Action<ProgressionDecision> OnProgressionDecision;
    public event Action<Achievement> OnAchievementEarned;
    public event Action<string> OnDifficultyChanged;

    // ─── Achievement Definitions ──────────────────────────────

    private static readonly Achievement[] ACHIEVEMENTS = new Achievement[]
    {
        new Achievement { id = "first_port", title = "First Port!", description = "Complete your first port visit", icon = "⚓" },
        new Achievement { id = "five_ports", title = "Seasoned Sailor", description = "Visit 5 different ports", icon = "🗺️" },
        new Achievement { id = "ten_ports", title = "Mediterranean Master", description = "Visit 10 different ports", icon = "🏆" },
        new Achievement { id = "all_services", title = "Full Service", description = "Use all 11 port services at one port", icon = "🏢" },
        new Achievement { id = "polyglot_2", title = "Bilingual", description = "Practice in 2 different languages", icon = "🗣️" },
        new Achievement { id = "polyglot_4", title = "Polyglot", description = "Practice in 4 different languages", icon = "🌍" },
        new Achievement { id = "polyglot_6", title = "Tower of Babel", description = "Practice in 6 different languages", icon = "🗼" },
        new Achievement { id = "vocab_50", title = "Word Collector", description = "Learn 50 new words", icon = "📖" },
        new Achievement { id = "vocab_200", title = "Living Dictionary", description = "Learn 200 new words", icon = "📚" },
        new Achievement { id = "vocab_500", title = "Lexicon Master", description = "Learn 500 new words", icon = "🎓" },
        new Achievement { id = "npc_20", title = "Social Butterfly", description = "Talk to 20 different NPCs", icon = "👥" },
        new Achievement { id = "npc_50", title = "Local Legend", description = "Talk to 50 different NPCs", icon = "⭐" },
        new Achievement { id = "first_revisit", title = "Return Visitor", description = "Revisit a port you've been to before", icon = "🔄" },
        new Achievement { id = "accuracy_90", title = "Precision Speaker", description = "Achieve 90%+ accuracy in a session", icon = "🎯" },
        new Achievement { id = "night_sail", title = "Night Navigator", description = "Arrive at a port after dark", icon = "🌙" },
        new Achievement { id = "storm_sailor", title = "Storm Sailor", description = "Complete a port visit during a storm", icon = "⛈️" },
    };

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        // Listen for bridge metrics
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived += HandleBridgeMetrics;
        }
    }

    void OnDestroy()
    {
        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived -= HandleBridgeMetrics;
        }
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Record a port visit. Called by GameManager.ArriveAtPort().
    /// </summary>
    public void RecordPortVisit(string city, string locationId, string country)
    {
        bool isRevisit = _visitedPortIds.Contains(locationId);
        _visitedPortIds.Add(locationId);

        if (!_portVisitCounts.ContainsKey(locationId))
            _portVisitCounts[locationId] = 0;
        _portVisitCounts[locationId]++;

        // Track language
        PortData port = PortRegistryLoader.Instance?.GetPortById(locationId);
        string language = port?.language ?? country;
        if (!string.IsNullOrEmpty(language))
            _languagesEncountered.Add(language);

        Debug.Log($"[ProgressionAgent] 📈 Visit #{_visitedPortIds.Count}: {city}, {country} ({language})");

        // Check achievements
        CheckAchievements(isRevisit);
    }

    /// <summary>
    /// Record an NPC interaction.
    /// </summary>
    public void RecordNPCInteraction(string npcId, string npcRole, int wordsExchanged)
    {
        _totalNpcInteractions++;
        CheckNPCachievements();
    }

    /// <summary>
    /// Record newly learned words.
    /// </summary>
    public void RecordLearnedWords(IEnumerable<string> words)
    {
        foreach (var w in words) _learnedWords.Add(w.ToLower());
        CheckVocabAchievements();
    }

    /// <summary>
    /// Record scenario completion with stats.
    /// </summary>
    public void RecordScenarioCompletion(string portId, string portName, string country,
        int phasesCompleted, int totalPhases, float accuracy, float fluency, int wordsLearned)
    {
        _totalScenariosCompleted++;

        string language = "";
        PortData port = PortRegistryLoader.Instance?.GetPortById(portId);
        if (port != null) language = port.language ?? port.country ?? country;

        var record = new PortVisitRecord
        {
            portId = portId,
            portName = portName,
            country = country,
            language = language,
            timestamp = Time.time,
            phasesCompleted = phasesCompleted,
            totalPhases = totalPhases,
            accuracy = accuracy,
            fluency = fluency,
            wordsLearned = wordsLearned
        };
        _visitHistory.Add(record);

        // Update language scores
        if (!string.IsNullOrEmpty(language))
        {
            float current = _languageScores.ContainsKey(language) ? _languageScores[language] : 0;
            _languageScores[language] = Mathf.Max(current, (accuracy + fluency) / 2f);
        }

        // Track best scores
        if (accuracy > _bestAccuracy) _bestAccuracy = accuracy;
        if (fluency > _bestFluency) _bestFluency = fluency;

        // Accuracy achievement
        if (accuracy >= 0.9f) TryAwardAchievement("accuracy_90");

        // Adjust difficulty based on performance
        AdjustDifficulty(accuracy, fluency);

        // Generate summary
        EmitDecision(new ProgressionDecision
        {
            type = DecisionType.GenerateSummary,
            message = GeneratePortSummary(record),
            confidence = 0.95f,
            payload = new Dictionary<string, object>
            {
                { "portId", portId },
                { "accuracy", accuracy },
                { "fluency", fluency },
                { "wordsLearned", wordsLearned },
                { "phasesCompleted", phasesCompleted }
            }
        });
    }

    /// <summary>
    /// Get ports the player has visited.
    /// </summary>
    public HashSet<string> GetVisitedPortIds() => new HashSet<string>(_visitedPortIds);

    /// <summary>
    /// Get languages the player has encountered.
    /// </summary>
    public HashSet<string> GetLanguagesEncountered() => new HashSet<string>(_languagesEncountered);

    /// <summary>
    /// Get total stats for display.
    /// </summary>
    public Dictionary<string, object> GetStats()
    {
        return new Dictionary<string, object>
        {
            { "portsVisited", _visitedPortIds.Count },
            { "languages", _languagesEncountered.Count },
            { "wordsLearned", _learnedWords.Count },
            { "npcInteractions", _totalNpcInteractions },
            { "scenariosCompleted", _totalScenariosCompleted },
            { "achievements", _earnedAchievements.Count },
            { "bestAccuracy", _bestAccuracy },
            { "bestFluency", _bestFluency },
            { "speechSpeed", npcSpeechSpeed },
            { "effectiveCefrLevel", effectiveCefrLevel }
        };
    }

    // ─── Difficulty Adjustment ────────────────────────────────

    void AdjustDifficulty(float accuracy, float fluency)
    {
        float composite = accuracy * 0.5f + fluency * 0.5f;
        string oldLevel = effectiveCefrLevel;

        // Adjust NPC speech speed
        if (composite > 0.85f)
        {
            npcSpeechSpeed = Mathf.Min(2.0f, npcSpeechSpeed + 0.1f);
            vocabularyComplexity = Mathf.Min(1.0f, vocabularyComplexity + 0.05f);
        }
        else if (composite < 0.4f)
        {
            npcSpeechSpeed = Mathf.Max(0.5f, npcSpeechSpeed - 0.15f);
            vocabularyComplexity = Mathf.Max(0.0f, vocabularyComplexity - 0.1f);
        }

        // Adjust effective CEFR level
        if (composite > 0.85f && _visitedPortIds.Count >= 3)
        {
            effectiveCefrLevel = PromoteCefrLevel(effectiveCefrLevel);
        }
        else if (composite < 0.3f)
        {
            effectiveCefrLevel = DemoteCefrLevel(effectiveCefrLevel);
        }

        if (effectiveCefrLevel != oldLevel)
        {
            OnDifficultyChanged?.Invoke(effectiveCefrLevel);
            EmitDecision(new ProgressionDecision
            {
                type = DecisionType.AdjustDifficulty,
                message = $"Adjusting level to {effectiveCefrLevel}. NPC speech speed: {npcSpeechSpeed:F1}x.",
                confidence = 0.8f,
                payload = new Dictionary<string, object>
                {
                    { "cefrLevel", effectiveCefrLevel },
                    { "speechSpeed", npcSpeechSpeed },
                    { "vocabularyComplexity", vocabularyComplexity }
                }
            });

            Debug.Log($"[ProgressionAgent] 📊 Level adjusted: {oldLevel} → {effectiveCefrLevel}, speed={npcSpeechSpeed:F1}x");
        }
    }

    string PromoteCefrLevel(string level)
    {
        switch (level)
        {
            case "A1": return "A2";
            case "A2": return "B1";
            case "B1": return "B2";
            case "B2": return "C1";
            default: return level;
        }
    }

    string DemoteCefrLevel(string level)
    {
        switch (level)
        {
            case "C1": return "B2";
            case "B2": return "B1";
            case "B1": return "A2";
            case "A2": return "A1";
            default: return level;
        }
    }

    // ─── Achievements ─────────────────────────────────────────

    void CheckAchievements(bool isRevisit)
    {
        if (_visitedPortIds.Count >= 1) TryAwardAchievement("first_port");
        if (_visitedPortIds.Count >= 5) TryAwardAchievement("five_ports");
        if (_visitedPortIds.Count >= 10) TryAwardAchievement("ten_ports");
        if (isRevisit) TryAwardAchievement("first_revisit");

        if (_languagesEncountered.Count >= 2) TryAwardAchievement("polyglot_2");
        if (_languagesEncountered.Count >= 4) TryAwardAchievement("polyglot_4");
        if (_languagesEncountered.Count >= 6) TryAwardAchievement("polyglot_6");

        // Night/storm achievements
        if (WeatherSystem.Instance != null)
        {
            if (WeatherSystem.Instance.GetTimeOfDay() > 0.85f) TryAwardAchievement("night_sail");
            if (WeatherSystem.Instance.GetBeaufortScale() >= 6) TryAwardAchievement("storm_sailor");
        }
    }

    void CheckVocabAchievements()
    {
        if (_learnedWords.Count >= 50) TryAwardAchievement("vocab_50");
        if (_learnedWords.Count >= 200) TryAwardAchievement("vocab_200");
        if (_learnedWords.Count >= 500) TryAwardAchievement("vocab_500");
    }

    void CheckNPCachievements()
    {
        if (_totalNpcInteractions >= 20) TryAwardAchievement("npc_20");
        if (_totalNpcInteractions >= 50) TryAwardAchievement("npc_50");
    }

    void TryAwardAchievement(string id)
    {
        if (_earnedAchievements.Contains(id)) return;
        _earnedAchievements.Add(id);

        var achievement = ACHIEVEMENTS.FirstOrDefault(a => a.id == id);
        if (string.IsNullOrEmpty(achievement.id)) return;

        OnAchievementEarned?.Invoke(achievement);

        EmitDecision(new ProgressionDecision
        {
            type = DecisionType.AwardAchievement,
            message = $"{achievement.icon} Achievement Unlocked: {achievement.title} — {achievement.description}",
            confidence = 1.0f,
            payload = new Dictionary<string, object>
            {
                { "achievementId", id },
                { "title", achievement.title }
            }
        });

        Debug.Log($"[ProgressionAgent] 🏆 Achievement: {achievement.icon} {achievement.title}");
    }

    // ─── Summary Generation ───────────────────────────────────

    string GeneratePortSummary(PortVisitRecord record)
    {
        string grade;
        float composite = (record.accuracy + record.fluency) / 2f;
        if (composite >= 0.9f) grade = "⭐⭐⭐ Excellent!";
        else if (composite >= 0.75f) grade = "⭐⭐ Good work!";
        else if (composite >= 0.5f) grade = "⭐ Keep practicing!";
        else grade = "Room for improvement";

        return $"Port Visit Summary — {record.portName}, {record.country}\n" +
               $"Language: {record.language}\n" +
               $"Phases completed: {record.phasesCompleted}/{record.totalPhases}\n" +
               $"Accuracy: {record.accuracy * 100:F0}% | Fluency: {record.fluency * 100:F0}%\n" +
               $"New words learned: {record.wordsLearned}\n" +
               $"Overall: {grade}\n" +
               $"Total ports: {_visitedPortIds.Count} | Languages: {_languagesEncountered.Count} | " +
               $"Words: {_learnedWords.Count} | Level: {effectiveCefrLevel}";
    }

    // ─── Bridge Integration ───────────────────────────────────

    void HandleBridgeMetrics(BridgeMessage msg)
    {
        if (msg.type != "evaluation/metrics") return;

        // Update from TypeScript EvaluationAgent
        var payload = msg.payload as Dictionary<string, object>;
        if (payload == null) return;

        if (payload.ContainsKey("accuracy"))
            _bestAccuracy = Mathf.Max(_bestAccuracy, Convert.ToSingle(payload["accuracy"]));
        if (payload.ContainsKey("fluency"))
            _bestFluency = Mathf.Max(_bestFluency, Convert.ToSingle(payload["fluency"]));
        if (payload.ContainsKey("cefrLevel"))
            effectiveCefrLevel = payload["cefrLevel"].ToString();
        if (payload.ContainsKey("learnedWords") && payload["learnedWords"] is IEnumerable<string> words)
            RecordLearnedWords(words);
    }

    void EmitDecision(ProgressionDecision decision)
    {
        OnProgressionDecision?.Invoke(decision);
    }
}
