// Explicit preset keeps the original First Contact server's default unchanged.
process.env.SPACE_DRAGON_UNITY_BUILD = 'launch';
process.env.SPACE_DRAGON_UNITY_PORT ||= '5195';
await import('./serve.mjs');
