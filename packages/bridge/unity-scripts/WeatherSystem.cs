/*
 * WeatherSystem.cs — Day/night cycle, wind, and sea state.
 *
 * SETUP:
 *   1. Attach to a persistent GameObject
 *   2. Auto-finds directional light (sun)
 *   3. Controls lighting, fog, and sea color based on time of day
 *   4. Wind affects yacht sailing and wave behavior
 *
 * Time: 1 real minute = 1 game hour (24 min full day cycle)
 * Override with SetTimeScale() for faster/slower cycles.
 */

using UnityEngine;

/// <summary>
/// Manages weather, day/night cycle, wind, and sea state.
/// Affects yacht handling and visual atmosphere.
/// </summary>
public class WeatherSystem : MonoBehaviour
{
    [Header("Time")]
    public float timeScale = 1f;  // 1.0 = 1 real min per game hour
    public float startHour = 8f;  // Game starts at 8am

    [Header("Sun")]
    public Gradient sunColor;
    public AnimationCurve sunIntensity;
    public float sunRotationOffset = -90f;

    [Header("Sky")]
    public Gradient skyColor;
    public Gradient fogColor;

    [Header("Sea")]
    public Gradient seaColorOverDay;

    [Header("Wind")]
    public float windDirection = 0f;     // degrees
    public float windStrength = 5f;      // knots
    public float gustVariance = 3f;      // knots variance
    public float windShiftRate = 0.1f;   // degrees per second

    [Header("Sea State (Beaufort)")]
    public int beaufortScale = 3;        // 0-12
    public float swellPeriod = 6f;       // seconds
    public float swellHeight = 0.5f;     // meters

    // ─── State ────────────────────────────────────────────────

    public static WeatherSystem Instance { get; private set; }

    public float CurrentHour { get; private set; }
    public float CurrentWindSpeed { get; private set; }
    public float CurrentWindDirection { get; private set; }
    public bool IsDaytime => CurrentHour >= 6f && CurrentHour < 20f;
    public bool IsGoldenHour => (CurrentHour >= 6f && CurrentHour < 7.5f) ||
                                 (CurrentHour >= 18.5f && CurrentHour < 20f);

    private Light _sun;
    private float _timeAccumulator;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        CurrentHour = startHour;
        CurrentWindDirection = windDirection;
        CurrentWindSpeed = windStrength;

        // Find or create sun
        _sun = FindObjectOfType<Light>();
        if (_sun == null || _sun.type != LightType.Directional)
        {
            var sunGO = new GameObject("Sun");
            _sun = sunGO.AddComponent<Light>();
            _sun.type = LightType.Directional;
        }

        // Setup default gradients if not assigned
        SetupDefaultGradients();
    }

    void Update()
    {
        // Advance time
        _timeAccumulator += Time.deltaTime * timeScale;
        float hoursElapsed = _timeAccumulator / 60f; // 1 real min = 1 game hour
        CurrentHour = (startHour + hoursElapsed) % 24f;

        UpdateSun();
        UpdateSky();
        UpdateWind();
        UpdateSeaState();
    }

    // ─── Public API ───────────────────────────────────────────

    public void SetTime(float hour)
    {
        CurrentHour = hour % 24f;
        _timeAccumulator = (hour - startHour) * 60f;
    }

    public void SetTimeScale(float scale)
    {
        timeScale = scale;
    }

    /// <summary>Get wind as a world-space vector</summary>
    public Vector3 GetWindVector()
    {
        float rad = CurrentWindDirection * Mathf.Deg2Rad;
        return new Vector3(Mathf.Sin(rad), 0, Mathf.Cos(rad)) * CurrentWindSpeed;
    }

    /// <summary>Get a human-readable weather description</summary>
    public string GetWeatherDescription()
    {
        string timeOfDay = CurrentHour < 6 ? "night" :
                          CurrentHour < 12 ? "morning" :
                          CurrentHour < 18 ? "afternoon" :
                          CurrentHour < 20 ? "evening" : "night";

        string windDesc = CurrentWindSpeed < 5 ? "calm" :
                          CurrentWindSpeed < 10 ? "light breeze" :
                          CurrentWindSpeed < 15 ? "moderate wind" :
                          CurrentWindSpeed < 20 ? "fresh wind" : "strong wind";

        string seaDesc = beaufortScale <= 2 ? "calm seas" :
                         beaufortScale <= 4 ? "slight seas" :
                         beaufortScale <= 6 ? "moderate seas" : "rough seas";

        string cardinal = GetCardinal(CurrentWindDirection);

        return $"Mediterranean {timeOfDay}. {windDesc} from {cardinal} at {CurrentWindSpeed:F0} kn. {seaDesc}.";
    }

    /// <summary>Get Beaufort scale number from current wind speed</summary>
    public float GetBeaufortScale()
    {
        float knots = CurrentWindSpeed;
        if (knots < 1) return 0;  if (knots < 4) return 1;
        if (knots < 7) return 2;  if (knots < 11) return 3;
        if (knots < 17) return 4; if (knots < 22) return 5;
        if (knots < 28) return 6; if (knots < 34) return 7;
        if (knots < 41) return 8; if (knots < 48) return 9;
        if (knots < 56) return 10; if (knots < 64) return 11;
        return 12;
    }

    /// <summary>Get time of day as 0..1 fraction (0=midnight, 0.5=noon)</summary>
    public float GetTimeOfDay() => CurrentHour / 24f;

    /// <summary>Get current wind speed in knots</summary>
    public float GetWindSpeed() => CurrentWindSpeed;

    /// <summary>Get current wind direction in degrees (0=N, 90=E)</summary>
    public float GetWindDirection() => CurrentWindDirection;

    // ─── Internal ─────────────────────────────────────────────

    void UpdateSun()
    {
        if (_sun == null) return;

        float normalizedTime = CurrentHour / 24f;

        // Sun arc
        float sunAngle = (normalizedTime * 360f) + sunRotationOffset;
        _sun.transform.rotation = Quaternion.Euler(sunAngle, 170f, 0);

        // Color and intensity
        if (sunColor != null)
            _sun.color = sunColor.Evaluate(normalizedTime);
        if (sunIntensity != null)
            _sun.intensity = sunIntensity.Evaluate(normalizedTime);
        else
            _sun.intensity = IsDaytime ? 1.2f : 0.05f;

        // Golden hour warmth
        if (IsGoldenHour)
        {
            _sun.color = Color.Lerp(_sun.color, new Color(1f, 0.7f, 0.3f), 0.5f);
            _sun.intensity *= 0.8f;
        }

        // Night
        if (!IsDaytime)
        {
            _sun.intensity = Mathf.Max(_sun.intensity, 0.02f);
            RenderSettings.ambientLight = new Color(0.05f, 0.05f, 0.12f);
        }
        else
        {
            RenderSettings.ambientLight = new Color(0.4f, 0.45f, 0.5f);
        }
    }

    void UpdateSky()
    {
        float normalizedTime = CurrentHour / 24f;

        Color sky;
        if (skyColor != null)
        {
            sky = skyColor.Evaluate(normalizedTime);
        }
        else
        {
            // Default sky progression
            if (CurrentHour < 5) sky = new Color(0.02f, 0.02f, 0.08f);       // Deep night
            else if (CurrentHour < 6) sky = new Color(0.15f, 0.1f, 0.25f);   // Pre-dawn
            else if (CurrentHour < 7) sky = new Color(0.6f, 0.4f, 0.35f);    // Sunrise
            else if (CurrentHour < 10) sky = new Color(0.5f, 0.7f, 0.9f);    // Morning
            else if (CurrentHour < 16) sky = new Color(0.4f, 0.65f, 0.95f);  // Midday
            else if (CurrentHour < 18) sky = new Color(0.5f, 0.6f, 0.85f);   // Afternoon
            else if (CurrentHour < 19.5f) sky = new Color(0.7f, 0.4f, 0.25f);// Sunset
            else if (CurrentHour < 21) sky = new Color(0.15f, 0.1f, 0.25f);  // Twilight
            else sky = new Color(0.02f, 0.02f, 0.08f);                        // Night
        }

        Camera.main.backgroundColor = sky;

        // Fog matches sky
        RenderSettings.fogColor = Color.Lerp(sky, new Color(0.6f, 0.7f, 0.8f), 0.3f);
    }

    void UpdateWind()
    {
        // Gradual wind shift
        CurrentWindDirection += Mathf.Sin(Time.time * 0.1f) * windShiftRate * Time.deltaTime;
        CurrentWindDirection = (CurrentWindDirection + 360f) % 360f;

        // Gust variation
        float gust = Mathf.PerlinNoise(Time.time * 0.5f, 0) * gustVariance;
        CurrentWindSpeed = windStrength + gust;
    }

    void UpdateSeaState()
    {
        // Beaufort scale affects wave parameters
        if (beaufortScale <= 1)
        {
            swellHeight = 0.1f;
            swellPeriod = 8f;
        }
        else if (beaufortScale <= 3)
        {
            swellHeight = 0.3f;
            swellPeriod = 5f;
        }
        else if (beaufortScale <= 5)
        {
            swellHeight = 1f;
            swellPeriod = 4f;
        }
        else
        {
            swellHeight = 2.5f;
            swellPeriod = 3f;
        }

        // Update yacht wave parameters
        var yacht = YachtController.Instance;
        if (yacht != null)
        {
            yacht.waveAmplitude = swellHeight;
            yacht.wavePeriod = swellPeriod;
        }
    }

    string GetCardinal(float degrees)
    {
        string[] cardinals = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};
        int index = Mathf.RoundToInt(degrees / 45f) % 8;
        return cardinals[index];
    }

    void SetupDefaultGradients()
    {
        if (sunColor == null)
        {
            sunColor = new Gradient();
            var colorKeys = new GradientColorKey[5];
            colorKeys[0] = new GradientColorKey(new Color(0.1f, 0.1f, 0.2f), 0f);      // Midnight
            colorKeys[1] = new GradientColorKey(new Color(1f, 0.6f, 0.3f), 0.27f);      // Sunrise
            colorKeys[2] = new GradientColorKey(new Color(1f, 0.95f, 0.85f), 0.5f);     // Noon
            colorKeys[3] = new GradientColorKey(new Color(1f, 0.5f, 0.2f), 0.79f);      // Sunset
            colorKeys[4] = new GradientColorKey(new Color(0.1f, 0.1f, 0.2f), 1f);       // Midnight
            var alphaKeys = new GradientAlphaKey[2];
            alphaKeys[0] = new GradientAlphaKey(1f, 0f);
            alphaKeys[1] = new GradientAlphaKey(1f, 1f);
            sunColor.SetKeys(colorKeys, alphaKeys);
        }

        if (sunIntensity == null)
        {
            sunIntensity = new AnimationCurve();
            sunIntensity.AddKey(0f, 0.02f);     // Midnight
            sunIntensity.AddKey(0.25f, 0.3f);   // 6am
            sunIntensity.AddKey(0.35f, 1.0f);   // 8:24am
            sunIntensity.AddKey(0.5f, 1.3f);    // Noon
            sunIntensity.AddKey(0.65f, 1.0f);   // 3:36pm
            sunIntensity.AddKey(0.8f, 0.4f);    // 7:12pm
            sunIntensity.AddKey(0.85f, 0.02f);  // 8:24pm
            sunIntensity.AddKey(1f, 0.02f);     // Midnight
        }
    }
}
