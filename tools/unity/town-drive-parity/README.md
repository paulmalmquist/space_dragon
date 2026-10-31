# Town Drive C# parity harness

This dependency-free .NET console harness compiles the actual Unity Town Drive
`Core/*.cs` files. Expected outputs come from the retained TypeScript runtime's
exported fixtures. It does not substitute a second physics implementation.

Requires the .NET 8 runtime/targeting pack or a newer SDK with .NET 8 installed.
No Unity Editor process, browser, NUnit package or external service is needed.
The project uses C# 9 to keep accidental newer-language dependencies visible.
Runtime data comes from `TownDrive/Data/town-drive-v001.json`; golden test inputs
come from `TownDrive/Tests/EditMode/Fixtures/town-drive-fixtures-v001.json`.
Both are copied to the harness output directory for the run.

From the repository root, after generating the Town Drive data and fixtures:

```powershell
dotnet run --project tools/unity/town-drive-parity/TownDriveParity.csproj --configuration Release
```

Append `-- --report artifacts/unity-town-drive/parity-report.json` to write a
machine-readable receipt with fixture counts, fingerprints, input file hashes,
assertions and maximum observed numeric difference. Optional `--data path` and
`--fixtures path` arguments select explicit exported inputs. The harness rejects
data and fixtures with different source fingerprints.

The canonical `unity/SpaceDragon/Assets/SpaceDragon/TownDrive` directory is used
when present. Otherwise the harness uses the isolated staging copy under
`artifacts/unity-town-drive/staging`. To select a specific candidate explicitly:

```powershell
dotnet run --project tools/unity/town-drive-parity/TownDriveParity.csproj --configuration Release -p:TownDriveRoot=C:/absolute/path/to/TownDrive
```

The run prints its source directory and source fingerprint, checks the exported
route, semantic fixed-step scenarios and presentation fixtures, then exercises
pause, reset, checkpoint order/duplicates, replay and positive wrapping. A
failure exits nonzero with the case and divergent field. A passing run proves
only the named pure C# behavior; Unity compilation, rendering, controls, saves,
browser play and human driving comfort require their separate checks.

Golden numeric comparisons allow `1e-7 + abs(expected) * 1e-10` for JavaScript/C#
floating-point differences. Strings, booleans, array order and counts remain
exact. Every expected state field must exist in the C# state contract. Test
cases include closure collisions, off-road and median recovery, and rendering
interpolation at 30, 60 and 144 Hz plus uneven cadence. The cadence test exercises
the shared pure presentation function, not actual GPU frame delivery.

The thirteenth group drives a complete lap using only throttle, brake and steer
inputs with all 278 exported closure collision proxies enabled. It requires the
ordered checkpoints, mapped shared return and home bulb, finite state, zero
contact ticks, continuous motion and completion within 180–300 simulated
seconds. Its driver never writes a pose or progress directly. The receipt
includes lap duration, visited checkpoints and maximum distance per fixed step.
