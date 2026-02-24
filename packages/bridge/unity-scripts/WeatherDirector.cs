/*
 * WeatherDirector.cs — Weather as a learning-relevant game mechanic.
 *
 * Promotes WeatherSystem from visual decoration to an active agent
 * that creates learning opportunities through weather events.
 *
 * Responsibilities:
 *   - Trigger weather-specific language scenarios (storm VHF drills)
 *   - "Should we shelter?" decisions based on Beaufort scale
 *   - Weather vocabulary embedded in gameplay decisions
 *   - Coordinate with CrewAgent for weather-driven conversations
 *   - Route influence: suggest safer alternatives in bad weather
 *
 * Decisions:
 *   trigger_weather_scenario, suggest_shelter, weather_vocabulary
 *
 * Integrates with:
 *   - WeatherSystem (wind, sea state, time of day)
 *   - NavigationAgent (route planning)
 *   - CrewAgent (weather conversations)
 *   - VHFRadioUI (emergency protocol drills)
 *   - AAPMBridge (weather events to TypeScript)
 */

using System;
using System.Collections.Generic;
using UnityEngine;

public class WeatherDirector : MonoBehaviour
{
    public static WeatherDirector Instance { get; private set; }

    [Header("Configuration")]
    [Tooltip("Beaufort scale at which shelter is suggested")]
    public float shelterThreshold = 6f;
    [Tooltip("Beaufort scale at which emergency drill triggers")]
    public float emergencyThreshold = 8f;
    [Tooltip("Min seconds between weather decisions")]
    public float decisionCooldown = 120f;

    // ─── State ────────────────────────────────────────────────

    private float _lastDecisionTime = -999f;
    private bool _shelterSuggested = false;
    private bool _emergencyDrillActive = false;
    private float _previousBeaufort = 0f;
    private WeatherTrend _trend = WeatherTrend.Stable;
    private int _weatherVocabLessonsGiven = 0;

    private enum WeatherTrend { Improving, Stable, Deteriorating }

    // ─── Decision Types ───────────────────────────────────────

    public enum DecisionType
    {
        WeatherVocabulary,
        SuggestShelter,
        EmergencyDrill,
        ConditionReport,
        SailingAdvice
    }

    public struct WeatherDecision
    {
        public DecisionType type;
        public string message;
        public float confidence;
        public float beaufort;
        public Dictionary<string, object> payload;
    }

    // ─── Events ───────────────────────────────────────────────

    public event Action<WeatherDecision> OnWeatherDecision;
    public event Action OnEmergencyDrillStarted;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Update()
    {
        if (WeatherSystem.Instance == null) return;
        if (Time.time - _lastDecisionTime < decisionCooldown) return;

        float beaufort = WeatherSystem.Instance.GetBeaufortScale();

        // Track trend
        if (beaufort > _previousBeaufort + 0.5f)
            _trend = WeatherTrend.Deteriorating;
        else if (beaufort < _previousBeaufort - 0.5f)
            _trend = WeatherTrend.Improving;
        else
            _trend = WeatherTrend.Stable;
        _previousBeaufort = beaufort;

        // ── Think ──
        Think(beaufort);
    }

    // ─── Think ────────────────────────────────────────────────

    void Think(float beaufort)
    {
        float timeOfDay = WeatherSystem.Instance.GetTimeOfDay();
        string windDesc = WeatherSystem.Instance.GetWeatherDescription();

        // ── Emergency drill (Beaufort 8+) ──
        if (beaufort >= emergencyThreshold && !_emergencyDrillActive)
        {
            _emergencyDrillActive = true;
            _lastDecisionTime = Time.time;
            OnEmergencyDrillStarted?.Invoke();

            EmitDecision(new WeatherDecision
            {
                type = DecisionType.EmergencyDrill,
                message = "⚠️ STORM WARNING — Beaufort " + beaufort.ToString("F0") +
                          "! Practice emergency VHF protocol:\n" +
                          "\"Sécurité, sécurité, sécurité — this is motor yacht [name], " +
                          "position [lat/lon], experiencing severe weather, " +
                          "requesting updated weather forecast, over.\"\n" +
                          "'Sécurité' is French — it means 'safety' and is the standard " +
                          "maritime call for weather and navigation warnings.",
                confidence = 0.95f,
                beaufort = beaufort,
                payload = new Dictionary<string, object>
                {
                    { "scenario", "emergency_vhf" },
                    { "vocabulary", new[] { "sécurité", "mayday", "pan-pan", "storm", "tempête", "tormenta" } }
                }
            });
            return;
        }

        // Reset emergency when weather improves
        if (beaufort < emergencyThreshold - 1 && _emergencyDrillActive)
        {
            _emergencyDrillActive = false;
        }

        // ── Shelter suggestion (Beaufort 6-7) ──
        if (beaufort >= shelterThreshold && !_shelterSuggested &&
            GameManager.Instance?.CurrentState == GameState.Sailing)
        {
            _shelterSuggested = true;
            _lastDecisionTime = Time.time;

            string language = GameManager.Instance?.targetLanguage ?? "Spanish";
            string shelterWord = GetShelterVocab(language);

            EmitDecision(new WeatherDecision
            {
                type = DecisionType.SuggestShelter,
                message = $"Wind increasing to Beaufort {beaufort:F0}. We should consider {shelterWord}. " +
                          $"The nearest safe harbor may offer protection from the {GetWindDirection()} wind.",
                confidence = 0.85f,
                beaufort = beaufort,
                payload = new Dictionary<string, object>
                {
                    { "action", "suggest_shelter" },
                    { "vocabulary", shelterWord }
                }
            });
            return;
        }

        // Reset shelter flag when wind drops
        if (beaufort < shelterThreshold - 1) _shelterSuggested = false;

        // ── Weather vocabulary lessons ──
        if (_weatherVocabLessonsGiven < 10 && GameManager.Instance?.CurrentState == GameState.Sailing)
        {
            string lesson = GenerateWeatherVocabLesson(beaufort, timeOfDay);
            if (!string.IsNullOrEmpty(lesson))
            {
                _weatherVocabLessonsGiven++;
                _lastDecisionTime = Time.time;

                EmitDecision(new WeatherDecision
                {
                    type = DecisionType.WeatherVocabulary,
                    message = lesson,
                    confidence = 0.65f,
                    beaufort = beaufort,
                    payload = new Dictionary<string, object> { { "lessonIndex", _weatherVocabLessonsGiven } }
                });
                return;
            }
        }

        // ── Condition reports (trend changes) ──
        if (_trend == WeatherTrend.Deteriorating)
        {
            _lastDecisionTime = Time.time;
            EmitDecision(new WeatherDecision
            {
                type = DecisionType.ConditionReport,
                message = $"Weather deteriorating — now Beaufort {beaufort:F0}. {windDesc}. " +
                          "Keep a good lookout and monitor VHF Channel 16 for coastal warnings.",
                confidence = 0.7f,
                beaufort = beaufort,
                payload = new Dictionary<string, object> { { "trend", "deteriorating" } }
            });
        }
        else if (_trend == WeatherTrend.Improving && beaufort > 3)
        {
            _lastDecisionTime = Time.time;
            EmitDecision(new WeatherDecision
            {
                type = DecisionType.ConditionReport,
                message = $"Weather improving — now Beaufort {beaufort:F0}. {windDesc}. Good conditions ahead.",
                confidence = 0.6f,
                beaufort = beaufort,
                payload = new Dictionary<string, object> { { "trend", "improving" } }
            });
        }
    }

    // ─── Vocabulary Lessons ───────────────────────────────────

    string GenerateWeatherVocabLesson(float beaufort, float timeOfDay)
    {
        string language = GameManager.Instance?.targetLanguage ?? "Spanish";

        // Weather vocab by condition
        if (beaufort < 2)
        {
            return GetCalmWeatherLesson(language);
        }
        else if (beaufort < 4)
        {
            return GetModerateWeatherLesson(language);
        }
        else
        {
            return GetRoughWeatherLesson(language);
        }
    }

    string GetCalmWeatherLesson(string language)
    {
        var lessons = new Dictionary<string, string>
        {
            { "Spanish", "Calm seas today — 'mar en calma'. The wind is 'viento', and 'brisa' means breeze. Perfect sailing weather is 'buen tiempo para navegar'." },
            { "French", "Calm seas — 'mer calme'. The wind is 'le vent', and 'une brise' means breeze. 'Beau temps pour naviguer' — good weather for sailing." },
            { "Italian", "Mare calmo — calm sea. 'Il vento' is the wind, 'la brezza' is a breeze. 'Bel tempo per navigare' — beautiful weather for sailing." },
            { "Greek", "Calm sea is 'ήρεμη θάλασσα' (iremi thalassa). Wind is 'ο άνεμος' (o anemos). 'Καλός καιρός' (kalos kairos) means good weather." },
            { "Turkish", "Calm sea — 'sakin deniz'. Wind is 'rüzgar', and 'esinti' means breeze. 'Güzel hava' — beautiful weather." }
        };

        return lessons.ContainsKey(language) ? lessons[language] :
            $"Calm seas today. In maritime terminology, Beaufort 1 is called 'light air' — barely enough to fill the sails.";
    }

    string GetModerateWeatherLesson(string language)
    {
        var lessons = new Dictionary<string, string>
        {
            { "Spanish", "Moderate breeze — 'brisa moderada'. Waves are 'olas'. 'El mar está un poco movido' means the sea is a bit choppy." },
            { "French", "Brise modérée — moderate breeze. 'Les vagues' are waves. 'La mer est un peu agitée' — the sea is a bit rough." },
            { "Italian", "Brezza moderata — moderate breeze. 'Le onde' are waves. 'Il mare è un po' mosso' — the sea is a bit rough." },
            { "Greek", "Moderate wind — 'μέτριος άνεμος' (metrios anemos). Waves are 'κύματα' (kymata). 'Η θάλασσα είναι λίγο ταραγμένη' — slightly rough sea." },
            { "Turkish", "Moderate breeze — 'orta esinti'. Waves are 'dalgalar'. 'Deniz biraz dalgalı' — the sea is a bit wavy." }
        };

        return lessons.ContainsKey(language) ? lessons[language] :
            "Moderate breeze — Beaufort 4. Good sailing conditions but keep an eye on the forecast.";
    }

    string GetRoughWeatherLesson(string language)
    {
        var lessons = new Dictionary<string, string>
        {
            { "Spanish", "¡Cuidado! Strong wind — 'viento fuerte'. 'Mar agitado' means rough sea. 'Reducir vela' — reduce sail. Important VHF phrase: 'solicito pronóstico meteorológico' — I request weather forecast." },
            { "French", "Attention! Vent fort — strong wind. 'Mer agitée' — rough sea. 'Réduire la voilure' — reduce sail. VHF: 'je demande les prévisions météo' — I request weather forecast." },
            { "Italian", "Attenzione! Vento forte — strong wind. 'Mare agitato' — rough sea. 'Ridurre le vele' — reduce sail. VHF: 'richiedo le previsioni meteo'." },
            { "Greek", "Προσοχή! Strong wind — 'δυνατός άνεμος' (dynatos anemos). 'Ταραγμένη θάλασσα' (taragmeni thalassa) — rough sea." },
            { "Turkish", "Dikkat! 'Kuvvetli rüzgar' — strong wind. 'Dalgalı deniz' — rough sea. 'Yelken küçült' — reduce sail." }
        };

        return lessons.ContainsKey(language) ? lessons[language] :
            "Strong winds — Beaufort 5+. Monitor VHF Channel 16 for weather warnings. Consider reducing speed.";
    }

    // ─── Helpers ──────────────────────────────────────────────

    string GetShelterVocab(string language)
    {
        switch (language)
        {
            case "Spanish": return "buscar refugio (seek shelter)";
            case "French": return "chercher un abri (seek shelter)";
            case "Italian": return "cercare rifugio (seek shelter)";
            case "Greek": return "αναζήτηση καταφυγίου (seek shelter)";
            case "Turkish": return "sığınak aramak (seek shelter)";
            default: return "seeking shelter";
        }
    }

    string GetWindDirection()
    {
        if (WeatherSystem.Instance == null) return "prevailing";
        float windAngle = WeatherSystem.Instance.GetWindDirection();

        if (windAngle >= 337.5f || windAngle < 22.5f) return "northerly";
        if (windAngle < 67.5f) return "northeasterly";
        if (windAngle < 112.5f) return "easterly";
        if (windAngle < 157.5f) return "southeasterly";
        if (windAngle < 202.5f) return "southerly";
        if (windAngle < 247.5f) return "southwesterly";
        if (windAngle < 292.5f) return "westerly";
        return "northwesterly";
    }

    void EmitDecision(WeatherDecision decision)
    {
        OnWeatherDecision?.Invoke(decision);
        Debug.Log($"[WeatherDirector] [{decision.type}] Beaufort {decision.beaufort:F0}: {decision.message}");
    }
}
