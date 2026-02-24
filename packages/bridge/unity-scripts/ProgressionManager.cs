/*
 * ProgressionManager.cs — Save/load game progression state.
 *
 * SETUP:
 *   1. Attach to the same GameObject as GameManager
 *   2. Progression auto-saves on port departure and every 5 minutes
 *   3. Save data goes to Application.persistentDataPath
 *
 * Tracks: voyage log, crew bonds, language progress
 */

using System;
using System.IO;
using UnityEngine;

/// <summary>
/// Handles serialization/deserialization of player progression.
/// Listens to GameManager events and auto-saves at key moments.
/// </summary>
public class ProgressionManager : MonoBehaviour
{
    [Header("Settings")]
    public float autoSaveInterval = 300f; // 5 minutes
    public string saveFileName = "cielos_save.json";

    // ─── Singleton ────────────────────────────────────────────

    public static ProgressionManager Instance { get; private set; }

    // ─── State ────────────────────────────────────────────────

    public ProgressionData Data { get; private set; }

    private float _lastSaveTime;
    private string SavePath => Path.Combine(Application.persistentDataPath, saveFileName);

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        // Load existing save or create new
        if (File.Exists(SavePath))
        {
            LoadGame();
        }
        else
        {
            Data = CreateNewProgression();
        }

        _lastSaveTime = Time.time;

        // Listen for game events
        if (GameManager.Instance != null)
        {
            GameManager.Instance.OnGameStateChanged += OnGameStateChanged;
            GameManager.Instance.OnCityChanged += OnCityChanged;
        }
    }

    void Update()
    {
        // Auto-save check
        if (Time.time - _lastSaveTime >= autoSaveInterval)
        {
            SaveGame();
            _lastSaveTime = Time.time;
        }
    }

    void OnDestroy()
    {
        SaveGame(); // Save on quit
        if (GameManager.Instance != null)
        {
            GameManager.Instance.OnGameStateChanged -= OnGameStateChanged;
            GameManager.Instance.OnCityChanged -= OnCityChanged;
        }
    }

    // ─── Public API ───────────────────────────────────────────

    public void SaveGame()
    {
        if (Data == null) return;

        Data.lastSaved = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        Data.totalPlayTimeMs += (long)((Time.time - _lastSaveTime) * 1000);

        string json = JsonUtility.ToJson(Data, true);
        File.WriteAllText(SavePath, json);
        Debug.Log($"[Progression] 💾 Saved to {SavePath}");
    }

    public void LoadGame()
    {
        try
        {
            string json = File.ReadAllText(SavePath);
            Data = JsonUtility.FromJson<ProgressionData>(json);
            Debug.Log($"[Progression] 📂 Loaded save: {Data.playerName}, Day {Data.dayNumber}");
        }
        catch (Exception e)
        {
            Debug.LogError($"[Progression] Failed to load save: {e.Message}");
            Data = CreateNewProgression();
        }
    }

    public void NewGame(string playerName, string targetLang, string cefrLevel)
    {
        Data = CreateNewProgression();
        Data.playerName = playerName;
        Data.targetLanguage = targetLang;
        Data.cefrLevel = cefrLevel;
        SaveGame();
    }

    /// <summary>Record a completed dialogue for progression</summary>
    public void RecordDialogue(string npcId, string language, bool goalAchieved, int turns, int frictionCount)
    {
        if (Data == null) return;

        Data.totalDialogues++;

        // Update crew bond if NPC is crew
        var bond = Data.FindCrewBond(npcId);
        if (bond != null)
        {
            int delta = 2 + (goalAchieved ? 3 : 0) + (turns >= 5 ? 1 : 0) - (frictionCount > 3 ? 1 : 0);
            bond.bondScore = Mathf.Min(100, bond.bondScore + Mathf.Max(0, delta));
            bond.conversationsCount++;
            UpdateBondLevel(bond);
        }

        // Track language
        if (!string.IsNullOrEmpty(language) && Data.languagesUsed != null &&
            System.Array.IndexOf(Data.languagesUsed, language) < 0)
        {
            var list = new System.Collections.Generic.List<string>(Data.languagesUsed);
            list.Add(language);
            Data.languagesUsed = list.ToArray();
        }
    }

    /// <summary>Record a port visit</summary>
    public void RecordPortVisit(string cityName, string country, string language, int dialogues)
    {
        if (Data == null) return;

        Data.portsVisited++;
        Data.totalDialogues += dialogues;

        // Track country
        if (!string.IsNullOrEmpty(country) && Data.countriesVisited != null &&
            System.Array.IndexOf(Data.countriesVisited, country) < 0)
        {
            var list = new System.Collections.Generic.List<string>(Data.countriesVisited);
            list.Add(country);
            Data.countriesVisited = list.ToArray();
        }

        Data.dayNumber++;
        SaveGame();
    }

    // ─── Internal ─────────────────────────────────────────────

    void OnGameStateChanged(GameState state)
    {
        if (state == GameState.Summary)
        {
            SaveGame();
        }
    }

    void OnCityChanged(string city)
    {
        Debug.Log($"[Progression] Arriving at {city}");
    }

    void UpdateBondLevel(CrewBondData bond)
    {
        if (bond.bondScore >= 85) bond.bondLevel = "confidant";
        else if (bond.bondScore >= 60) bond.bondLevel = "friend";
        else if (bond.bondScore >= 35) bond.bondLevel = "colleague";
        else if (bond.bondScore >= 15) bond.bondLevel = "acquaintance";
        else bond.bondLevel = "stranger";
    }

    ProgressionData CreateNewProgression()
    {
        return new ProgressionData
        {
            playerName = "Captain",
            targetLanguage = "Spanish",
            cefrLevel = "A2",
            difficulty = "traveler",
            dayNumber = 1,
            portsVisited = 0,
            totalDialogues = 0,
            totalPlayTimeMs = 0,
            countriesVisited = new string[0],
            languagesUsed = new string[0],
            crewBonds = new CrewBondData[]
            {
                new CrewBondData { crewId = "first-mate-luca", name = "Luca", bondScore = 10, bondLevel = "acquaintance", conversationsCount = 0 },
                new CrewBondData { crewId = "chef-yasmine", name = "Yasmine", bondScore = 10, bondLevel = "acquaintance", conversationsCount = 0 },
                new CrewBondData { crewId = "deckhand-emre", name = "Emre", bondScore = 10, bondLevel = "acquaintance", conversationsCount = 0 },
                new CrewBondData { crewId = "engineer-sofia", name = "Sofia", bondScore = 10, bondLevel = "acquaintance", conversationsCount = 0 },
            },
            startedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            lastSaved = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
    }
}

// ─── Serializable Data ────────────────────────────────────────

[Serializable]
public class ProgressionData
{
    public string playerName;
    public string targetLanguage;
    public string cefrLevel;
    public string difficulty;
    public int dayNumber;
    public int portsVisited;
    public int totalDialogues;
    public long totalPlayTimeMs;
    public string[] countriesVisited;
    public string[] languagesUsed;
    public CrewBondData[] crewBonds;
    public long startedAt;
    public long lastSaved;

    public CrewBondData FindCrewBond(string crewId)
    {
        if (crewBonds == null) return null;
        foreach (var b in crewBonds)
        {
            if (b.crewId == crewId) return b;
        }
        return null;
    }
}

[Serializable]
public class CrewBondData
{
    public string crewId;
    public string name;
    public int bondScore;
    public string bondLevel;
    public int conversationsCount;
}
