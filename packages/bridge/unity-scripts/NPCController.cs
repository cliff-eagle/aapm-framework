/*
 * NPCController.cs — NPC idle behavior, look-at-player, and dialogue trigger.
 *
 * Attached by NPCSpawner to each NPC GameObject.
 *
 * Behaviors:
 *   - Idle animation (gentle sway, weight shift)
 *   - Look at player when nearby
 *   - Billboard name labels (always face camera)
 *   - Context-aware greeting based on time of day and culture
 *   - Cultural note delivery during dialogue
 *   - Wander within a small radius
 */

using UnityEngine;

/// <summary>
/// Controls a single NPC's behavior: idle movement, look-at-player,
/// billboard labels, and provides dialogue context to AAPMBridge.
/// </summary>
public class NPCController : MonoBehaviour
{
    [Header("Identity (set by NPCSpawner)")]
    public string npcName;
    public string role;
    public string language;
    public string personality;
    public string culturalNote;
    public string portName;
    public string portCountry;

    [Header("Behavior")]
    public float lookAtDistance = 8f;
    public float greetingDistance = 4f;
    public float wanderRadius = 3f;
    public float wanderSpeed = 0.3f;
    public float idleSwayAmount = 0.02f;
    public float idleSwaySpeed = 1.5f;

    // ─── State ────────────────────────────────────────────────

    private Transform _player;
    private Transform _labelCanvas;
    private Vector3 _homePosition;
    private Vector3 _wanderTarget;
    private float _wanderTimer;
    private bool _hasGreeted;
    private bool _isLookingAtPlayer;
    private float _swayPhase;

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        _homePosition = transform.position;
        _wanderTarget = _homePosition;
        _swayPhase = Random.Range(0f, Mathf.PI * 2f); // Random start phase

        // Find label canvas for billboarding
        _labelCanvas = transform.Find("NameLabel");

        // Find player
        var playerGO = GameObject.FindGameObjectWithTag("Player");
        if (playerGO != null) _player = playerGO.transform;
    }

    void Update()
    {
        HandleBillboard();
        HandleIdleSway();
        HandleWander();
        HandlePlayerProximity();
    }

    // ─── Behaviors ────────────────────────────────────────────

    void HandleBillboard()
    {
        // Make name label always face the camera
        if (_labelCanvas != null && Camera.main != null)
        {
            _labelCanvas.LookAt(
                _labelCanvas.position + Camera.main.transform.forward,
                Vector3.up
            );
        }
    }

    void HandleIdleSway()
    {
        // Gentle weight-shift sway
        float sway = Mathf.Sin(Time.time * idleSwaySpeed + _swayPhase) * idleSwayAmount;
        Vector3 pos = transform.position;
        pos.x = _isLookingAtPlayer ? pos.x : _homePosition.x + sway;
        transform.position = pos;
    }

    void HandleWander()
    {
        if (_isLookingAtPlayer) return; // Don't wander when engaged

        _wanderTimer -= Time.deltaTime;
        if (_wanderTimer <= 0)
        {
            // Pick new wander target
            Vector2 circle = Random.insideUnitCircle * wanderRadius;
            _wanderTarget = _homePosition + new Vector3(circle.x, 0, circle.y);
            _wanderTimer = Random.Range(4f, 10f);
        }

        // Move toward wander target
        Vector3 direction = _wanderTarget - transform.position;
        direction.y = 0;
        if (direction.magnitude > 0.3f)
        {
            transform.position += direction.normalized * wanderSpeed * Time.deltaTime;

            // Face movement direction
            Quaternion targetRot = Quaternion.LookRotation(direction, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, 2f * Time.deltaTime);
        }
    }

    void HandlePlayerProximity()
    {
        if (_player == null) return;

        float dist = Vector3.Distance(transform.position, _player.position);

        // Look at player when close
        if (dist < lookAtDistance)
        {
            _isLookingAtPlayer = true;

            Vector3 lookDir = _player.position - transform.position;
            lookDir.y = 0;
            if (lookDir.magnitude > 0.1f)
            {
                Quaternion targetRot = Quaternion.LookRotation(lookDir, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, 3f * Time.deltaTime);
            }

            // Greeting when entering close range
            if (dist < greetingDistance && !_hasGreeted)
            {
                _hasGreeted = true;
                ShowGreeting();
            }
        }
        else
        {
            _isLookingAtPlayer = false;
            if (dist > greetingDistance * 2f) _hasGreeted = false;
        }
    }

    // ─── Greetings ────────────────────────────────────────────

    void ShowGreeting()
    {
        string greeting = GetCulturalGreeting();
        Debug.Log($"[NPC] {npcName}: {greeting}");

        // Show greeting via DialogueUI
        var dialogueUI = FindObjectOfType<DialogueUI>();
        if (dialogueUI != null)
        {
            dialogueUI.ShowNPCBubble(npcName, greeting);
        }
    }

    string GetCulturalGreeting()
    {
        // Time-aware greetings
        int hour = System.DateTime.Now.Hour;
        bool isMorning = hour >= 5 && hour < 12;
        bool isAfternoon = hour >= 12 && hour < 18;

        // Culture-specific greetings
        if (portCountry == null) return "Hello!";

        switch (portCountry.ToLower())
        {
            case "spain":
                return isMorning ? "¡Buenos días! ¿Llegáis de lejos?" :
                       isAfternoon ? "¡Buenas tardes! Bienvenidos al puerto." :
                       "¡Buenas noches! Estáis a tiempo para cenar.";

            case "france":
            case "monaco":
                return isMorning ? "Bonjour ! Vous venez d'arriver ?" :
                       "Bonsoir ! Bienvenue au port.";

            case "italy":
            case "italy (sicily)":
            case "italy (sardinia)":
                return isMorning ? "Buongiorno! Benvenuti!" :
                       "Buonasera! Da dove venite?";

            case "greece":
            case "greece (crete)":
                return "Γεια σας! Καλωσήρθατε! (Yia sas! Kalosirthate!)";

            case "turkey":
                return "Hoş geldiniz! Merhaba!";

            case "croatia":
            case "montenegro":
            case "slovenia":
                return "Dobrodošli! Bok!";

            case "malta":
                return "Merħba! Welcome to our island!";

            case "morocco":
            case "tunisia":
            case "algeria":
            case "egypt":
            case "libya":
                return "!أهلاً وسهلاً (Ahlan wa sahlan!)";

            case "israel":
                return "!שלום (Shalom!)";

            case "lebanon":
                return "!مرحبا (Marhaba!)";

            case "albania":
                return "Mirë se vini! Tungjatjeta!";

            case "cyprus":
                return "Γεια σας! Καλωσορίσατε!";

            default:
                return "Welcome! Hello!";
        }
    }

    // ─── Dialogue Context ─────────────────────────────────────

    /// <summary>
    /// Returns a context string for AI dialogue generation.
    /// Sent to AAPMBridge as system prompt context.
    /// </summary>
    public string GetDialogueContext()
    {
        return $@"You are {npcName}, a {role} at {portName}, {portCountry}.
Language: {language}
Personality: {personality}
Cultural note: {culturalNote}

Stay in character. Use the local language occasionally (with translation).
Share cultural insights naturally through conversation.
If the player makes a language mistake, gently correct them.
Reference local landmarks, food, and customs authentically.";
    }
}
