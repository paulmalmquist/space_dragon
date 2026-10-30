# Decision — traffic and roadside detail

Recorded October 30, 2026 · **SD-055** · **CONFIRMED**.

Owner source: “fill the world with NPC cars, traffic and a few more details also. dealers choice on details”.

This explicitly authorizes the traffic work previously held outside SD-046. Add moving vehicles in both directions, multiple paint/body variants, signal/following behavior and bounded collision proxies, alongside parked vehicles and ordinary roadside details chosen by the agent. Keep it forgiving: no traffic penalties, damage, game-over or mission/save expansion. NPC simulation remains separate from rendering and freezes when the drive is paused.

Use local original geometry and existing licensed materials. Shared templates, instancing, distance culling and bounded nearby collision/shadow lists control cost. Preserve the SD-052 privacy-rule removal and the existing route, player controls, checkpoint reset and save behavior. [The combined verification receipt](../reports/2026-10-30-town-drive-detail.md) records actual checks, visual review and measured performance.
