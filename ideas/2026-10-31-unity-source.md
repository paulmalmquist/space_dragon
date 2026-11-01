# Unity direction — original owner messages, October 31, 2026

Preserved verbatim from chat. Routing and authority are recorded under SD-083 in the inbox and ledger. Supplied research claims are source text, not independent verification.

## Message 1

Yes. I think Unity is the right direction for Space Dragon, and we can absolutely target ordinary home computers. We just need to engineer for that from the beginning rather than build an ultra-heavy PC game and attempt to shrink it afterward.

Your Railway backend fits this architecture well.

## How Space Dragon would run

Player's computer

Unity 6.6 · 3D graphics · Physics · Input · Audio

Web browser

Windows app

HTTPS / WebSockets

Railway backend

Player saves · Accounts · Mission state · Progress · Future multiplayer services

Static Unity web builds and large game assets can be served from a CDN separately.

Railway doesn't need to render the world or calculate every movement. The player's computer handles that locally. Railway provides persistent services over HTTPS or secure WebSockets, both suitable for this architecture.&#x20;

Railway Docs

## Will it work on a normal computer?

Yes, with appropriately optimized scenes and graphics presets.

|   |
| - |

Computer type

|   |
| - |

Proposed graphics preset

|   |
| - |

Performance target

|   |
| - |

Basic laptop, integrated graphics, 8–16 GB RAM

|   |
| - |

Low, 720p

|   |
| - |

30 fps

|   |
| - |

Typical modern laptop, integrated graphics, 16 GB RAM

|   |
| - |

Balanced, 720–900p

|   |
| - |

30–45 fps

|   |
| - |

Midrange gaming PC, dedicated GPU

|   |
| - |

High, 1080p

|   |
| - |

60 fps

|   |
| - |

Strong gaming PC

|   |
| - |

Cinematic, 1440p

|   |
| - |

60 fps

These are development targets, not measured performance or guaranteed hardware compatibility.

Unity officially supports modern Windows, Mac, and Linux desktop browsers with WebGL2 and WebAssembly. Unity 6.6 also supports WebGPU with automatic WebGL2 fallback when configured.&#x20;

Unity Docs+1

### Your current computer

The Lenovo Ryzen 7 5825U laptop we previously inspected has approximately 14 GB usable RAM and integrated AMD Radeon graphics.

I expect it can run the Unity Editor and a reasonably optimized Space Dragon build. Its integrated GPU, however, should be treated as our minimum-performance benchmark, not our cinematic benchmark.

It may struggle with multiple high-resolution characters, complex real-time shadows, heavy particles, and large detailed environments. We'd need actual browser and native-build tests to establish its performance.

## The key: ship two quality profiles

[Futuristic Digital Dragon in Lighter Tone | AI Art Generator | Easy-Peasy.AI](https://images.openai.com/static-rsc-4/7R8olLo-tL7HX7gH2UWuwALzgYXlmpOlmaMxwXDh3nSse85lOcTC6yfqb_C_I1JZxHDczhpR6JVoydrW_DGfTHdfc2bhvVYooVYosSSda4ht27YjTCc1gH3GCIYgOxPV7Qo4zE8gmhB4JJiDnG4wr-zLGVHF7dbT7MWMAaitFrY?purpose=inline)

Cinematic profile

Dedicated GPU · Higher resolution · Detailed shadows · Richer effects and distant environments

[Mecadrako, novo chefe do Free Fire chega com muitas recompensas - Liga dos Games](https://images.openai.com/static-rsc-4/-YfCPbPAVTsyXQJD38xdpJtzveivgqiNb62einLzPpcUv6qcfkbnuR0RjdvQgzjOP3_xhel_81kFHBWCFUdBWNddopyQp64O3R5hMIP-axa18O_WT38-fxJCzG8LYlEnAhuFqC3OQ-iOf6UvNFdtKIq9iwS0iml3BH_g_ehOcKk?purpose=inline)

Balanced profile

Integrated GPU · Lower render resolution · Reduced shadows and particles · Same core gameplay

These are illustrative visual targets, not actual Space Dragon renders.

Unity 6.6 also supports progressive asset loading, letting the web game load the opening scene first rather than requiring every planet and asset upfront. That's particularly useful for our three-act story.&#x20;

Unity Docs

## My proposed production stack

|   |
| - |

Layer

|   |
| - |

Technology

|   |
| - |

Game engine

|   |
| - |

Unity 6.6

|   |
| - |

Rendering

|   |
| - |

URP, WebGPU with WebGL2 fallback

|   |
| - |

Models and animation

|   |
| - |

Blender 5.2

|   |
| - |

Cinematics

|   |
| - |

Unity Timeline + Cinemachine

|   |
| - |

Input

|   |
| - |

Unity Input System, PlayStation controllers

|   |
| - |

Backend

|   |
| - |

Railway + existing API stack

|   |
| - |

Web delivery

|   |
| - |

Static hosting/CDN at `/space-dragon`

|   |
| - |

Development automation

|   |
| - |

Claude/Codex, Unity batch builds, Playwright browser tests

|   |
| - |

Platforms

|   |
| - |

Browser first, Windows desktop second

We would keep the existing Babylon prototype as a reference until Unity reproduces the opening flow and passes the tests.

## What I would do first

Build the Unity version of the First Contact scene and test it on your existing laptop.

The performance gates I'd initially target are a 30 fps baseline on the integrated Radeon, 60 fps on a representative gaming PC, smooth controller input, and reliable browser loading. We'd also compare the native Windows version against the browser build.

If it works well, we migrate the rest of Space Dragon to Unity and begin developing the dragon, family characters, combat, and planetary exploration.

One additional advantage: We can release the same game in two forms—play instantly in a browser or download a higher-fidelity PC version. Both can communicate with the same Railway backend and use the same progression system.

That gives us a route toward genuine AAA-style presentation without requiring everyone to own a gaming

## Message 2

## What I'd do next

Since the existing Space Dragon runtime is still a fairly small placeholder prototype, we're at a particularly good moment to evaluate changing engines.

I'd create a Unity production candidate alongside the current Babylon game.

Unity migration proof of concept

1. Set up Unity 6.6 with URP, WebGPU primary and WebGL2 fallback.
2. Import the same Blender dragon or pod asset into Unity and Babylon.
3. Rebuild the cinematic backyard-arrival scene with realistic lighting, animation, and effects.
4. Add a third-person character controller, PlayStation controller support, and a short playable interaction.
5. Export both versions for the browser and compare appearance, load time, memory, and frame rate on your actual hardware.
6. Verify that Codex/Claude can reliably edit the Unity project, run tests, and produce browser builds without fragile manual Editor steps.
