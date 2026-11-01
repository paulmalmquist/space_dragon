using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Compact cockpit instruments. All actions route through the encounter.</summary>
    public sealed class DogfightHud : MonoBehaviour
    {
        static readonly Color Cyan = new Color(.58f,.91f,.94f,.95f);
        static readonly Color Amber = new Color(1,.67f,.31f,.98f);
        static readonly Color Red = new Color(1,.25f,.16f,.98f);
        static readonly Color Muted = new Color(.59f,.68f,.71f,.85f);
        static readonly Color Ink = new Color(.015f,.04f,.055f,.81f);
        DogfightEncounter encounter;
        GUIStyle label, small, title, number, center, button, letter, overlayTitle;
        float clock;
        TacticalWarning lastWarning;
        float warningAge;
        float width, height, scale;
        string PrimaryLabel => encounter.UseSpacecraftDragon ? "TWIN LASERS" : "PLASMA";
        public void Configure(DogfightEncounter owner) => encounter = owner;
        void Update()
        {
            if (encounter == null || encounter.Paused) return;
            clock += Time.deltaTime; warningAge += Time.deltaTime;
            if (encounter.Tactics != null && lastWarning != encounter.Tactics.HighestWarning)
            { lastWarning = encounter.Tactics.HighestWarning; warningAge = 0; }
        }

        void Styles()
        {
            if (label != null) return;
            label = new GUIStyle(GUI.skin.label) { fontSize = 15, wordWrap = false, richText = false };
            small = new GUIStyle(label) { fontSize = 13 };
            title = new GUIStyle(label) { fontSize = 18, fontStyle = FontStyle.Bold };
            number = new GUIStyle(label) { fontSize = 30, alignment = TextAnchor.MiddleRight };
            center = new GUIStyle(label) { alignment = TextAnchor.MiddleCenter };
            letter = new GUIStyle(center) { fontSize = 45, fontStyle = FontStyle.Bold };
            overlayTitle = new GUIStyle(center) { fontSize = 26, fontStyle = FontStyle.Bold };
            button = new GUIStyle(GUI.skin.button) { fontSize = 14, padding = new RectOffset(10,10,8,8) };
        }
        void OnGUI()
        {
            if (encounter == null || encounter.Tactics == null || encounter.Flight == null || encounter.Breath == null) return;
            Styles(); scale = Mathf.Clamp(Screen.height/900f,.5f,2); width = Screen.width/scale; height = Screen.height/scale;
            Matrix4x4 prior = GUI.matrix; Color priorColor = GUI.color;
            GUI.matrix = Matrix4x4.Scale(new Vector3(scale,scale,1)); GUI.color = Color.white;
            try
            {
                DrawCanopy(); DrawTargets(); DrawAim(); DrawHeader(); DrawWarning(); DrawRadar(); DrawSystems(); DrawMissiles(); DrawWord(); DrawFlight();
                if (!string.IsNullOrEmpty(encounter.Toast))
                { Panel(new Rect(width/2-270,130,540,36),Cyan,.45f); Text(new Rect(width/2-260,134,520,28),encounter.Toast,Cyan,center); }
                if (encounter.Tactics.IsRepairing) DrawRepairProgress();
                if (encounter.RepairSelectorOpen && !encounter.Paused && !encounter.Dead) DrawRepairSelector();
                if (encounter.Won && !encounter.Paused && !encounter.Dead)
                {
                    Panel(new Rect(width/2-225,175,450,52),Cyan,.68f);
                    Text(new Rect(width/2-215,179,430,24),"SQUADRON DISABLED",Cyan,center);
                    Text(new Rect(width/2-215,204,430,20),"Keep flying to collect salvage. ESC opens replay controls.",Muted,small);
                }
                if (encounter.Crashing && !encounter.Paused)
                {
                    Panel(new Rect(width/2-225,height-185,450,64),Red,.84f);
                    Text(new Rect(width/2-210,height-180,420,27),"ARMOR RUPTURE",Amber,center);
                    Text(new Rect(width/2-210,height-151,420,23),"CREW SECURE  /  RECOVERY SYSTEM ACTIVE",Cyan,center);
                }
                if (encounter.Paused || (encounter.Dead && !encounter.Crashing)) DrawOverlay();
            }
            finally { GUI.matrix = prior; GUI.color = priorColor; }
        }

        void DrawCanopy()
        {
            // Thin framing leaves the rendered world and wing silhouette visible.
            Line(new Vector2(10,80),new Vector2(10,height-100),new Color(.2f,.44f,.5f,.24f),2);
            Line(new Vector2(width-10,80),new Vector2(width-10,height-100),new Color(.2f,.44f,.5f,.24f),2);
            Line(new Vector2(10,height-100),new Vector2(90,height-10),Muted,.8f);
            Line(new Vector2(width-10,height-100),new Vector2(width-90,height-10),Muted,.8f);
        }
        void DrawHeader()
        {
            Diamond(new Vector2(38,40),9,Amber,1.8f);
            Text(new Rect(63,25,270,30),"S P A C E   D R A G O N",Amber,title);
            Text(new Rect(64,55,330,24),"DOGFIGHT LAB  /  LOCAL ENCOUNTER",Muted,small);
            Text(new Rect(width-310,27,285,25),"DISABLE THE DRONE SQUADRON",Cyan,label);
            Text(new Rect(width-300,55,270,36),encounter.AliveEnemies+"  HOSTILES",Amber,number);
            Text(new Rect(width/2-95,17,190,23),"HDG "+Mathf.RoundToInt(Mathf.Repeat(encounter.Flight.Rotation.eulerAngles.y,360)).ToString("000"),Muted,center);
        }
        void DrawWarning()
        {
            var warning = encounter.Tactics.HighestWarning;
            float acquired = 0; bool enemyLocked = false;
            if (encounter.Enemies != null) foreach (var enemy in encounter.Enemies)
                if (!enemy.Dead) { acquired = Mathf.Max(acquired,enemy.TargetProgress); enemyLocked |= enemy.Locked; }
            string message; Color color; bool showLockProgress = false;
            if (warning == TacticalWarning.HullImminent) { message = "HULL FAILURE IMMINENT  â€”  BREAK AWAY / REPAIR"; color = Red; }
            else if (warning == TacticalWarning.IncomingMissile) { message = "INCOMING MISSILE  â€”  Q / E ROLL  Â·  HOLD B TURN"; color = Red; }
            else if (warning == TacticalWarning.Critical) { message = "CRITICAL SYSTEM DAMAGE  â€”  HOLD TAB TO REPAIR"; color = Red; }
            else if (encounter.AsteroidClearance >= 0 && !encounter.Dead) { message = "ASTEROID  /  "+Mathf.CeilToInt(encounter.AsteroidClearance)+" m  â€”  PULL CLEAR"; color = Amber; }
            else if (enemyLocked || acquired > .15f) { message = enemyLocked ? "ENEMY LOCK  â€”  Q / E EVADE" : "ENEMY TRACKING  â€”  KEEP MOVING"; color = Amber; showLockProgress = true; }
            else if (warning == TacticalWarning.Caution && warningAge < 3) { message = "SYSTEM CAUTION  â€”  HOLD TAB TO INSPECT"; color = Amber; }
            else return;
            var rect = new Rect(width/2-235,55,470,53); Panel(rect,color,.88f);
            Text(new Rect(rect.x+12,rect.y+7,rect.width-24,26),message,color,center);
            if (showLockProgress) Bar(new Rect(rect.x+25,rect.y+40,rect.width-50,4),enemyLocked?1:acquired,color);
            if (encounter.IncomingThreatWorld.HasValue && encounter.GameCamera != null)
            {
                var p = encounter.GameCamera.WorldToViewportPoint(encounter.IncomingThreatWorld.Value);
                Vector2 direction = new Vector2(p.x-.5f,.5f-p.y); if (p.z < 0) direction = -direction;
                if (direction.sqrMagnitude < .001f) direction = Vector2.up;
                direction.Normalize(); Vector2 point = new Vector2(width/2,height/2)+direction*110;
                Diamond(point,10,Red,3); Text(new Rect(point.x-42,point.y+14,84,24),"MISSILE",Red,center);
            }
        }
        void DrawAim()
        {
            Vector2 p = new Vector2((encounter.AimScreen.x*.5f+.5f)*width,(.5f-encounter.AimScreen.y*.5f)*height);
            Color color = encounter.Tactics.HasConfirmedLock ? Amber : Cyan;
            float size = 16;
            Line(p+Vector2.left*(size+8),p+Vector2.left*7,color,1.4f);
            Line(p+Vector2.right*7,p+Vector2.right*(size+8),color,1.4f);
            Line(p+Vector2.up*(size+8),p+Vector2.up*7,color,1.4f);
            Line(p+Vector2.down*7,p+Vector2.down*(size+8),color,1.4f);
            Fill(new Rect(p.x-1,p.y-1,2,2),color);
            if (encounter.Tactics.LockProgress > 0) Arc(p,30,-90,360*encounter.Tactics.LockProgress,Amber,2,16);
            if (encounter.Tactics.HasConfirmedLock) Text(new Rect(p.x-85,p.y+38,170,24),"ENTER  /  MISSILE",Amber,center);
            else if (encounter.Tactics.LockProgress > 0) Text(new Rect(p.x-85,p.y+38,170,24),"ACQUIRING",Amber,center);
        }
        void DrawTargets()
        {
            if (encounter.GameCamera == null) return;
            if (encounter.Enemies != null) foreach (var enemy in encounter.Enemies)
            {
                if (enemy.Dead) continue;
                var v = encounter.GameCamera.WorldToViewportPoint(enemy.Position);
                bool onScreen = v.z > 0 && v.x > .035f && v.x < .965f && v.y > .10f && v.y < .90f;
                Vector2 p = onScreen ? new Vector2(v.x*width,(1-v.y)*height) : ViewportPoint(v);
                Color color = enemy.Id == encounter.Tactics.LockedTargetId ? Cyan : Amber;
                if (onScreen)
                {
                    Brackets(new Rect(p.x-22,p.y-20,44,40),color);
                    Text(new Rect(p.x-85,p.y-43,170,22),encounter.Tuning.EnableEnemyRoles?enemy.Combat.Role.ToString().ToUpperInvariant():enemy.Id.ToUpperInvariant(),color,center);
                    if(enemy.Combat.ShieldIntact){Arc(p,36,-175,170,Cyan,3,12);Text(new Rect(p.x-65,p.y-65,130,20),"SHIELDED",Cyan,small);}
                    if(enemy.Combat.Latched)Text(new Rect(p.x-85,p.y+48,170,22),"LATCHED — ROLL",Red,center);
                    float distance = Vector3.Distance(encounter.Flight.Position,enemy.Position);
                    Text(new Rect(p.x-55,p.y+25,110,22),Mathf.RoundToInt(distance)+" m",color,center);
                    if (enemy.Id == encounter.Tactics.TrackingTargetId) Bar(new Rect(p.x-22,p.y+20,44,3),encounter.Tactics.LockProgress,color);
                }
                else Diamond(p,5,color,1.5f);
            }
            if (encounter.SalvageItems != null) foreach (var item in encounter.SalvageItems)
            {
                var v = encounter.GameCamera.WorldToViewportPoint(item.Position);
                if (v.z <= 0) continue;
                Vector2 p = ViewportPoint(v); Diamond(p,7,Cyan,1.5f);
                Text(new Rect(p.x-85,p.y+10,170,22),"SALVAGE "+Mathf.RoundToInt(Vector3.Distance(encounter.Flight.Position,item.Position))+" m",Cyan,center);
            }
        }
        Vector2 ViewportPoint(Vector3 v)
        {
            float x = v.z >= 0 ? v.x : 1-v.x, y = v.z >= 0 ? 1-v.y : v.y;
            return new Vector2(Mathf.Clamp(x*width,22,width-22),Mathf.Clamp(y*height,115,height-290));
        }
        void DrawRadar()
        {
            var c = new Vector2(123,height-141); const float radius = 91, range = 800;
            Fill(new Rect(c.x-radius,c.y-radius,radius*2,radius*2),new Color(.01f,.035f,.045f,.84f));
            // At the 1366x768 review canvas, these segment counts stay below
            // one physical pixel of arc error and remove 88 rotated GUI draws.
            Arc(c,radius,0,360,new Color(.48f,.76f,.79f,.55f),1,24);
            Arc(c,radius*.66f,0,360,new Color(.32f,.6f,.65f,.23f),1,20);
            Arc(c,radius*.33f,0,360,new Color(.32f,.6f,.65f,.23f),1,12);
            Line(c+Vector2.left*radius,c+Vector2.right*radius,new Color(.3f,.6f,.65f,.2f),1);
            Line(c+Vector2.up*radius,c+Vector2.down*radius,new Color(.3f,.6f,.65f,.2f),1);
            if (encounter.Enemies != null) foreach (var enemy in encounter.Enemies)
            {
                if (enemy.Dead) continue;
                Vector3 relative = Quaternion.Inverse(encounter.Flight.Rotation)*(enemy.Position-encounter.Flight.Position);
                Vector2 offset = Vector2.ClampMagnitude(new Vector2(relative.x,-relative.z)/range,1)*(radius-6);
                Diamond(c+offset,enemy.Locked?5:3.5f,enemy.Locked?Red:Amber,1.5f);
            }
            if (encounter.SalvageItems != null) foreach (var item in encounter.SalvageItems)
            {
                Vector3 relative = Quaternion.Inverse(encounter.Flight.Rotation)*(item.Position-encounter.Flight.Position);
                Vector2 offset = Vector2.ClampMagnitude(new Vector2(relative.x,-relative.z)/range,1)*(radius-6);
                Fill(new Rect(c.x+offset.x-2,c.y+offset.y-2,4,4),Cyan);
            }
            Line(c+new Vector2(-6,7),c+new Vector2(0,-9),Cyan,2);
            Line(c+new Vector2(0,-9),c+new Vector2(6,7),Cyan,2);
            Text(new Rect(35,height-40,180,23),"RELATIVE RADAR  /  800 m",Muted,small);
        }
        void DrawSystems()
        {
            float x = 240,y = height-239; var t = encounter.Tactics;
            // The near-orbit cloud deck can be bright behind the instruments.
            // Keep a compact cockpit backing without changing controls or layout.
            Panel(new Rect(x-10,y-10,248,224),Cyan,.89f);
            SystemBar(x,y,"HULL",t.Hull); SystemBar(x,y+42,"PROPULSION",t.Propulsion); SystemBar(x,y+84,"WEAPONS",t.Weapons);
            Text(new Rect(x,y+134,230,22),"SALVAGE  "+t.Salvage+" / "+encounter.Tuning.SalvageCapacity,Cyan,label);
            Text(new Rect(x,y+160,230,22),"FIELD REPAIRS  "+t.RepairsRemaining+" / "+encounter.Tuning.MaximumRepairs,t.RepairsRemaining>0?Cyan:Amber,label);
            Text(new Rect(x,y+189,240,22),"HOLD TAB  /  SYSTEM REPAIR",Muted,small);
        }
        void SystemBar(float x,float y,string name,float value)
        {
            Color c = value <= encounter.Tuning.CriticalHealth ? Red : value <= encounter.Tuning.CautionHealth ? Amber : Cyan;
            Text(new Rect(x,y,185,23),name,c,small); Text(new Rect(x+160,y-4,64,27),Mathf.CeilToInt(value).ToString(),c,center);
            Bar(new Rect(x,y+24,220,4),value/encounter.Tuning.MaxSystemHealth,c);
        }
        void DrawMissiles()
        {
            float x = width-291; var t = encounter.Tactics;
            Text(new Rect(x,131,250,22),"LOCK-ON MISSILES",Cyan,label);
            for (int i=0;i<encounter.Tuning.MaximumMissileCharges;i++)
            {
                Rect r = new Rect(x+i*53,163,43,12); Fill(r,i<t.MissileCharges?Amber:new Color(.2f,.3f,.32f,.6f));
                if (i==t.MissileCharges && t.MissileCharges<encounter.Tuning.MaximumMissileCharges) Fill(new Rect(r.x,r.y,r.width*t.RechargeProgress,r.height),Cyan);
            }
            string status = t.IsRepairing ? "REPAIRING / LAUNCH INHIBITED" : t.MissileCharges==0 ? "RECHARGING" : t.HasConfirmedLock ? "LOCKED / ENTER TO LAUNCH" : t.LockProgress>0 ? "ACQUIRING / HOLD ON TARGET" : "TRACK A BOGEY TO LOCK";
            Text(new Rect(x,182,275,22),status,t.HasConfirmedLock?Amber:Muted,small);
            if (t.MissileCharges<encounter.Tuning.MaximumMissileCharges)
            {
                Text(new Rect(x,206,275,23),"NEXT CHARGE  "+t.RechargeSecondsRemaining.ToString("0.0")+" s",Muted,small);
                if(t.Weapons<encounter.Tuning.MaxSystemHealth)
                    Text(new Rect(x,230,275,23),"WEAPON DAMAGE / SLOW RECHARGE",Amber,small);
            }
        }
        void DrawWord()
        {
            var b = encounter.Breath; var rect = new Rect(width-300,height-308,272,176); Panel(rect,Cyan,.91f);
            Text(new Rect(rect.x+16,rect.y+10,240,25),"WORD CHARGE / FIRE BEAM",Cyan,label);
            for (int i=0;i<4;i++)
            {
                string content = i<b.LetterIndex?b.Word[i].ToString():"";
                Color color = i<=b.LetterIndex?Amber:Muted;
                Text(new Rect(rect.x+14+i*56,rect.y+37,48,30),content,color,center);
                // Actual geometry keeps all four charge slots visible even when
                // the player font omits the em-dash glyph.
                Fill(new Rect(rect.x+23+i*56,rect.y+65,30,2),color);
            }
            if (b.Phase==BreathPhase.Charging)
            {
                float pulse = encounter.ReducedMotion ? 1 : .52f+.48f*(.5f+.5f*Mathf.Sin(clock*9));
                Color c = Amber; c.a = pulse; Brackets(new Rect(rect.x+18,rect.y+78,64,68),c);
                Text(new Rect(rect.x+18,rect.y+74,64,72),b.ExpectedLetter?.ToString()??"",c,letter);
                Text(new Rect(rect.x+96,rect.y+82,160,28),"PRESS "+b.ExpectedLetter,Cyan,title);
                Text(new Rect(rect.x+96,rect.y+116,160,23),"Keep flying. Keep dodging.",Muted,small);
            }
            else if (b.Phase==BreathPhase.Ready)
            {
                int locked = b.LockedIds.Length;
                Text(new Rect(rect.x+13,rect.y+83,246,30),locked>0?"SPACE  /  FIRE BEAM":"CHARGED / TRACK TARGET",Amber,center);
                Text(new Rect(rect.x+13,rect.y+120,246,25),locked>0?locked+" TARGET LOCKED":"Hold the reticle on a bogey",Muted,center);
            }
            else
            {
                var burst = b.Burst;
                Text(new Rect(rect.x+13,rect.y+82,246,34),burst!=null&&burst.Stage=="windup"?"DRAGON WINDUP":"FIRE BEAM",Amber,center);
                if(burst!=null) Bar(new Rect(rect.x+20,rect.y+129,232,5),burst.Progress,Amber);
            }
            Text(new Rect(rect.x+17,rect.y+151,238,21),"F1  /  CHARGE TOGETHER",Muted,small);
        }
        void DrawFlight()
        {
            var f = encounter.Flight;
            Panel(new Rect(width-290,height-137,268,126),Cyan,.89f);
            Text(new Rect(width-279,height-130,245,40),Mathf.RoundToInt(f.Speed)+" m/s",Cyan,number);
            Bar(new Rect(width-278,height-81,242,5),f.BoostEnergy/f.Tuning.BoostCapacity,Cyan);
            Text(new Rect(width-278,height-70,242,18),"BOOST",Muted,small);
            Bar(new Rect(width-278,height-46,242,4),f.EvasionEnergy/f.Tuning.EvasionCapacity,Amber);
            Text(new Rect(width-278,height-36,242,18),"EVASION",Muted,small);
            DrawFlightControls();
        }
        void DrawFlightControls()
        {
            // Short canvases need the left column for radar and system health.
            // The complete control legend remains available in the pause menu.
            if (height < 750) return;
            // Keep the lower center clear for the dragon's torso and tail. The
            // control placard stays in the left instrument column; a narrow
            // aspect moves it below the central warning/repair banner region.
            bool compact = width < 1320;
            var r = new Rect(32,compact?322:98,compact?252:340,compact?146:124);
            Panel(r,Cyan,.9f);
            Text(new Rect(r.x+12,r.y+7,r.width-24,23),"MOUSE: "+(encounter.MouseAimMode?"AIM":"FLY")+"  /  M SWITCH",Cyan,label);
            Text(new Rect(r.x+12,r.y+33,r.width-24,21),"ARROWS FLY  /  WADZ AIM",Muted,small);
            Text(new Rect(r.x+12,r.y+55,r.width-24,21),"LMB "+PrimaryLabel+"  /  RMB ZOOM",Muted,small);
            if (compact)
            {
                Text(new Rect(r.x+12,r.y+77,r.width-24,21),"SHIFT BOOST  /  Q/E TIMED ROLL",Muted,small);
                Text(new Rect(r.x+12,r.y+99,r.width-24,21),"HOLD B TURN",Muted,small);
                Text(new Rect(r.x+12,r.y+121,r.width-24,21),"ESC PAUSE / CONTROLS",Cyan,small);
            }
            else
            {
                Text(new Rect(r.x+12,r.y+77,r.width-24,21),"SHIFT BOOST  /  Q/E TIMED ROLL  /  HOLD B TURN",Muted,small);
                Text(new Rect(r.x+12,r.y+99,r.width-24,21),"ESC PAUSE / CONTROLS",Cyan,small);
            }
        }
        void DrawRepairProgress()
        {
            // Keep the work area and both maintenance drones visible in the
            // closer chase view. Leave room for the optional victory banner.
            var t = encounter.Tactics; var r = new Rect(width/2-218,encounter.Won?238:175,436,73); Panel(r,Cyan,.82f);
            Text(new Rect(r.x+12,r.y+8,r.width-24,24),"MAINTENANCE DRONES / "+t.RepairSystem.ToString().ToUpperInvariant(),Cyan,center);
            Bar(new Rect(r.x+19,r.y+39,r.width-38,5),t.RepairProgress,Cyan);
            Text(new Rect(r.x+12,r.y+48,r.width-24,22),"MANEUVERING AVAILABLE  Â·  BOOST / MISSILES INHIBITED",Muted,small);
        }
        void DrawRepairSelector()
        {
            var t = encounter.Tactics; var r = new Rect(width/2-310,height/2-125,620,270); Panel(r,Cyan,.98f);
            Text(new Rect(r.x+20,r.y+13,r.width-40,28),"FIELD REPAIR  /  CHOOSE A SYSTEM",Cyan,title);
            Text(new Rect(r.x+20,r.y+45,r.width-40,24),"1 SALVAGE  Â·  "+encounter.Tuning.RepairSeconds.ToString("0")+" SECONDS  Â·  "+t.RepairsRemaining+" ACTIVATIONS REMAIN",Amber,small);
            for (int i=0;i<3;i++)
            {
                float health = t.GetHealth((DragonSystem)i);
                float gain = Mathf.Min(encounter.Tuning.RepairAmount,encounter.Tuning.MaxSystemHealth-health);
                float y = r.y+82+i*52;
                Text(new Rect(r.x+20,y+8,180,24),(i+1)+"  "+((DragonSystem)i).ToString().ToUpperInvariant(),Cyan,label);
                Text(new Rect(r.x+198,y+8,210,24),Mathf.CeilToInt(health)+" â†’ "+Mathf.CeilToInt(health+gain)+"  (+"+Mathf.CeilToInt(gain)+")",Muted,label);
                bool wasEnabled = GUI.enabled;
                GUI.enabled = gain>0&&t.Salvage>0&&t.RepairsRemaining>0&&!t.IsRepairing&&!t.IsDestroyed;
                if (GUI.Button(new Rect(r.x+438,y,158,39),"REPAIR / 1 PART",button)) encounter.ChooseRepair(i);
                GUI.enabled = wasEnabled;
            }
            Text(new Rect(r.x+20,r.y+239,r.width-40,24),"A substantial hit interrupts work. Resources are used only on completion.",Muted,small);
        }
        void DrawOverlay()
        {
            Fill(new Rect(0,0,width,height),new Color(.005f,.015f,.025f,.72f));
            bool hasCredit = encounter.DragonAttribution != null;
            float panelHeight = hasCredit ? 628 : 500;
            var r = new Rect(width/2-250,height/2-panelHeight/2,500,panelHeight); Panel(r,encounter.Dead?Red:Cyan,.98f);
            string heading = encounter.Dead?"DRAGON DISABLED":"FLIGHT PAUSED";
            Text(new Rect(r.x+20,r.y+24,r.width-40,40),heading,encounter.Dead?Amber:Cyan,overlayTitle);
            Text(new Rect(r.x+20,r.y+72,r.width-40,26),encounter.Dead?"Recovery simulation / restart to fly again":"Simulation, repair and recharge timers are stopped",Muted,center);
            if (!encounter.Dead&&GUI.Button(new Rect(r.x+65,r.y+115,370,43),"RESUME FLIGHT",button)) encounter.TogglePause();
            float y = r.y+169;
            if (GUI.Button(new Rect(r.x+65,y,370,40),"SOUND: "+(encounter.SoundEnabled?"ON":"OFF â€” ENABLE"),button)) encounter.SetSoundEnabled(encounter.SoundEnabled?"false":"true");
            if (GUI.Button(new Rect(r.x+65,y+48,370,40),"REDUCED MOTION: "+(encounter.ReducedMotion?"ON":"OFF"),button)) encounter.SetReducedMotion(encounter.ReducedMotion?"false":"true");
            if (GUI.Button(new Rect(r.x+65,y+96,370,40),"RESTART ENCOUNTER",button)) encounter.RestartEncounter();
            // Always keep the complete legend available, including on canvases
            // where the compact flight instruments cannot show every reminder.
            Fill(new Rect(r.x+25,r.y+318,r.width-50,1),new Color(.58f,.91f,.94f,.3f));
            Text(new Rect(r.x+25,r.y+328,r.width-50,21),"ARROWS / MOUSE FLY  /  WADZ AIM",Cyan,small);
            Text(new Rect(r.x+25,r.y+350,r.width-50,21),"M SWITCH MOUSE MODE  /  LMB "+PrimaryLabel+"  /  RMB ZOOM",Muted,small);
            Text(new Rect(r.x+25,r.y+372,r.width-50,21),"SHIFT BOOST  /  Q/E TIMED ROLL  /  HOLD B TURN",Muted,small);
            Text(new Rect(r.x+25,r.y+394,r.width-50,21),"ENTER MISSILE  /  SPACE BEAM  /  HOLD TAB REPAIR",Muted,small);
            Text(new Rect(r.x+25,r.y+416,r.width-50,21),"F1 CHARGE TOGETHER  /  ESC PAUSE OR RESUME",Muted,small);
            Text(new Rect(r.x+30,r.y+453,r.width-60,26),"Local lab. Campaign progress and family saves stay separate.",Muted,small);
            if (hasCredit)
            {
                Text(new Rect(r.x+25,r.y+491,r.width-50,22),"Free Dragon Character 3D by Oscar Creativo",Cyan,small);
                Text(new Rect(r.x+25,r.y+514,r.width-50,22),"OSCAR CREATIVO Â· CC BY 4.0 Â· Modified for Space Dragon",Muted,small);
                if (GUI.Button(new Rect(r.x+25,r.y+555,218,36),"ORIGINAL MODEL / CREDIT",button))
                    Application.OpenURL("https://sketchfab.com/3d-models/free-dragon-character-3d-by-oscar-creativo-443971c0f42a49e5bedc0bfe2b544407");
                if (GUI.Button(new Rect(r.x+257,r.y+555,218,36),"CC BY 4.0 LICENSE",button))
                    Application.OpenURL("https://creativecommons.org/licenses/by/4.0/");
            }
        }
        static void Fill(Rect r,Color c) { Color old=GUI.color; GUI.color=c; GUI.DrawTexture(r,Texture2D.whiteTexture); GUI.color=old; }
        void Text(Rect r,string value,Color c,GUIStyle style) { Color old=GUI.color; GUI.color=c; GUI.Label(r,value,style); GUI.color=old; }
        static void Bar(Rect r,float value,Color c) { Fill(r,new Color(.2f,.35f,.38f,.55f)); Fill(new Rect(r.x,r.y,r.width*Mathf.Clamp01(value),r.height),c); }
        static void Panel(Rect r,Color c,float opacity)
        {
            Color bg=Ink; bg.a*=opacity; Fill(r,bg);
            Color edge=c; edge.a*=.45f; Fill(new Rect(r.x,r.y,r.width,1),edge); Fill(new Rect(r.x,r.yMax-1,r.width,1),edge);
            Fill(new Rect(r.x,r.y+1,2,22),c); Fill(new Rect(r.xMax-2,r.yMax-23,2,22),edge);
        }
        static void Brackets(Rect r,Color c)
        {
            const float s=10;
            Line(new Vector2(r.x,r.y+s),new Vector2(r.x,r.y),c,1.5f); Line(new Vector2(r.x,r.y),new Vector2(r.x+s,r.y),c,1.5f);
            Line(new Vector2(r.xMax-s,r.y),new Vector2(r.xMax,r.y),c,1.5f); Line(new Vector2(r.xMax,r.y),new Vector2(r.xMax,r.y+s),c,1.5f);
            Line(new Vector2(r.x,r.yMax-s),new Vector2(r.x,r.yMax),c,1.5f); Line(new Vector2(r.x,r.yMax),new Vector2(r.x+s,r.yMax),c,1.5f);
            Line(new Vector2(r.xMax-s,r.yMax),new Vector2(r.xMax,r.yMax),c,1.5f); Line(new Vector2(r.xMax,r.yMax),new Vector2(r.xMax,r.yMax-s),c,1.5f);
        }
        static void Diamond(Vector2 p,float size,Color c,float thickness)
        { Line(p+Vector2.up*size,p+Vector2.right*size,c,thickness); Line(p+Vector2.right*size,p+Vector2.down*size,c,thickness); Line(p+Vector2.down*size,p+Vector2.left*size,c,thickness); Line(p+Vector2.left*size,p+Vector2.up*size,c,thickness); }
        static void Arc(Vector2 center,float radius,float start,float sweep,Color c,float thickness,int segments)
        {
            if(Event.current.type!=EventType.Repaint)return;
            Vector2 last=center+new Vector2(Mathf.Cos(start*Mathf.Deg2Rad),Mathf.Sin(start*Mathf.Deg2Rad))*radius;
            for(int i=1;i<=segments;i++) { float a=(start+sweep*i/segments)*Mathf.Deg2Rad; Vector2 next=center+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*radius; Line(last,next,c,thickness); last=next; }
        }
        static void Line(Vector2 a,Vector2 b,Color c,float thickness)
        {
            if(Event.current.type!=EventType.Repaint)return;
            Matrix4x4 old=GUI.matrix; Color oldColor=GUI.color; Vector2 d=b-a;
            GUI.matrix=old*Matrix4x4.TRS(new Vector3(a.x,a.y,0),Quaternion.Euler(0,0,Mathf.Atan2(d.y,d.x)*Mathf.Rad2Deg),Vector3.one);
            GUI.color=c; GUI.DrawTexture(new Rect(0,-thickness*.5f,d.magnitude,thickness),Texture2D.whiteTexture); GUI.matrix=old; GUI.color=oldColor;
        }
    }
}
