# Unity Setup Guide — AAPM Mediterranean 🎮

## What You Need

- ✅ Unity (already installed)
- ✅ AAPM Framework (your repo)
- Free Mediterranean city asset pack from Unity Asset Store

## Step-by-Step Setup

### 1. Start the AAPM Bridge Server

Open Terminal and run:

```bash
cd "/Volumes/Extreme SSD/patent/aapm-framework"
npm install ws
npx tsx packages/bridge/src/server.ts
```

You should see:

```text
🌉 AAPM Bridge Server
   Listening on ws://0.0.0.0:8765
   Waiting for Unity client...
```

**Leave this running.**

---

### 2. Create a New Unity Project

1. Open **Unity Hub**
2. Click **New Project**
3. Select **3D (Core)** template
4. Name it `AAPM-Mediterranean-3D`
5. Click **Create Project**

---

### 3. Install WebSocketSharp

The C# scripts use the `websocket-sharp` library:

1. In Unity, go to **Window → Package Manager**
2. Click the **+** button → **Add package from git URL**
3. Enter: `https://github.com/sta/websocket-sharp.git`
4. Click **Add**

**Alternative**: Download `websocket-sharp.dll` from the [releases page](https://github.com/sta/websocket-sharp/releases) and drop it into `Assets/Plugins/`

---

### 4. Import the C# Scripts

Copy these 4 files from your repo into Unity:

| File                | Copy From                        | Copy To                |
| ------------------- | -------------------------------- | ---------------------- |
| AAPMBridge.cs       | `packages/bridge/unity-scripts/` | `Assets/Scripts/AAPM/` |
| NPCInteraction.cs   | `packages/bridge/unity-scripts/` | `Assets/Scripts/AAPM/` |
| DialogueUI.cs       | `packages/bridge/unity-scripts/` | `Assets/Scripts/AAPM/` |
| PlayerController.cs | `packages/bridge/unity-scripts/` | `Assets/Scripts/AAPM/` |

In Unity Explorer, right-click → **Show in Explorer** to find your `Assets` folder, then create `Assets/Scripts/AAPM/` and paste the files.

---

### 5. Import a Mediterranean City Asset

Go to the **Unity Asset Store** (Window → Asset Store) and search for:

- **Free**: "Low Poly Medieval Town" or "Simple Town Lite"
- **Paid ($5-30)**: "Mediterranean Village" or "European City Pack"
- **Best free option**: "Polygon Starter Pack" by Synty Studios

After importing, drag the city prefab into your scene.

---

### 6. Set Up the Player

1. **Create** → **3D Object** → **Capsule** (this is your player body)
2. **Tag** it as **"Player"** (very important — NPCInteraction looks for this tag)
3. **Add Component** → **Character Controller**
4. **Attach** `PlayerController.cs` to it
5. **Create** → **Camera** as a **child** of the Capsule
   - Set position to (0, 0.8, 0) — eye height
   - Delete the default Main Camera

---

### 7. Set Up the AAPM Bridge

1. **Create** → **Empty GameObject**, name it `"AAPMBridge"`
2. **Attach** `AAPMBridge.cs` to it
3. In the Inspector, set **Server URL** to `ws://localhost:8765`
4. Check **Auto Reconnect**

---

### 8. Place NPCs

1. Import or create a humanoid character model
2. Drag it into the scene (e.g., behind a counter in the café)
3. **Attach** `NPCInteraction.cs` to it
4. In the Inspector, set:
   - **NPC ID**: `npc_barista_carlos`
   - **NPC Display Name**: `Carlos`
   - **Location ID**: `cafe_barcelona`
   - **Default Goal**: `Order a coffee in Spanish`
5. **Add Component** → **Sphere Collider**
   - Check **Is Trigger**
   - Set **Radius** to `3` (interaction distance)

Repeat for each NPC you want to place.

---

### 9. Add the Dialogue UI

1. **Create** → **Empty GameObject**, name it `"DialogueManager"`
2. **Attach** `DialogueUI.cs` to it
3. The script will auto-create a basic dialogue panel
4. (Optional) Design a custom UI in Unity's Canvas system and wire the references

---

### 10. Hit Play ▶️

1. Make sure the bridge server is running in Terminal
2. Click **Play** in Unity
3. Walk up to an NPC with WASD
4. Press **E** to start talking
5. Type Spanish in the input field
6. Watch the AAPM brain respond with NPC dialogue, grammar corrections, and cultural tips!

---

## Controls

| Key    | Action                      |
| ------ | --------------------------- |
| WASD   | Walk                        |
| Mouse  | Look around                 |
| Shift  | Sprint                      |
| Space  | Jump                        |
| E      | Talk to NPC (when in range) |
| Enter  | Send dialogue message       |
| Escape | Toggle cursor lock          |

---

## Troubleshooting

| Problem                        | Solution                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------- |
| "Not connected" in console     | Make sure bridge server is running (`npx tsx packages/bridge/src/server.ts`) |
| NPC doesn't detect player      | Make sure player is tagged "Player" and NPC has a trigger collider           |
| No dialogue UI appears         | Make sure `DialogueUI.cs` is on a GameObject in the scene                    |
| WebSocket error                | Check firewall isn't blocking port 8765                                      |

---

## Recommended Free Assets

- 🏙️ [Polygon Starter Pack](https://assetstore.unity.com/packages/3d/props/polygon-starter-pack-low-poly-3d-art-by-synty-156819) — Low-poly buildings
- 👤 [Mixamo](https://www.mixamo.com/) — Free animated humanoid characters  
- 🌴 [Nature Starter Kit 2](https://assetstore.unity.com/packages/3d/environments/nature-starter-kit-2-52977) — Trees, rocks
- ☀️ [AllSky Free](https://assetstore.unity.com/packages/2d/textures-materials/sky/allsky-free-10-sky-skybox-set-146014) — Mediterranean skyboxes
